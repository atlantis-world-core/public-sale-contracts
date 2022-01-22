// SPDX-License-Identifier:  GNU General Public License v3.0
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IAtlantisWorldMagicalKeys} from "./interface/IAtlantisWorldMagicalKeys.sol";
import {IAtlantisWorldFoundingAtlanteanScrolls} from "./interface/IAtlantisWorldFoundingAtlanteanScrolls.sol";

/**
 * @title Atlantis World Alpha Sale contract, a controller for the entire club sale
 * @notice Contract can be used for the claiming the keys for Atlantis World, and redeeming the keys for scrolls later
 * @author Rachit Anand Srivastava, Carlo Miguel Dy
 * @dev All function calls are implemented with side effects on the key and scroll contracts
 */
contract AtlantisWorldAlphaSale is Ownable, Pausable, ReentrancyGuard {
  /**
   * @notice Key contracts
   */
  IAtlantisWorldMagicalKeys private _magicalkeysContract;
  IAtlantisWorldFoundingAtlanteanScrolls
    private _foundingAtlanteanScrollsContract;

  /**
   * @notice All the merkle roots - whitelist address and advisor addresses
   */
  bytes32 private whitelistMerkleRoot;
  bytes32 private advisorMerkleRoot;

  address private publicVerificationAddress;

  /**
   * @notice The mint price for a key = 0.22 ETH
   */
  uint256 public constant MINT_PRICE = (22 * 1e18) / 100;

  /// @notice WETH Contract
  IERC20 WETH;

  /**
   * @notice 9700 + 299 = 9999 Total Supply
   * @notice `PUBLIC_KEY_LIMIT` + `ADVISORY_KEY_LIMIT` = `TOTAL_SUPPLY` Total Supply
   */
  uint256 public constant PUBLIC_KEY_LIMIT = 9700;
  uint256 public constant ADVISORY_KEY_LIMIT = 299;
  uint256 public constant TOTAL_SUPPLY = PUBLIC_KEY_LIMIT + ADVISORY_KEY_LIMIT;

  /**
   * @notice The current mint count from public users
   */
  uint256 public publicKeyMintCount = 0;

  /**
   * @notice The current mint count from advisory users
   */
  uint256 public advisoryKeyLimitCount = 0;

  /**
   * @notice The timestamp for when the alpha sale launches
   */
  uint256 public startSaleBlockTimestamp;

  /**
   * @notice The timestamp for when the alpha sale stops
   */
  uint256 public stopSaleBlockTimestamp;

  /// @notice For assigning an address the right to withdraw funds
  address private targetAddress;

  /// @notice to keep track if the advisor / user whitelisted has already claimed the NFT
  mapping(address => bool) private _publicSaleWhitelisterToClaimed;
  mapping(address => bool) private _advisoryAddressToClaimed;

  /// @notice to keep track of used nonces during the public sale
  mapping(string => bool) private _usedNonces;

  /// @dev Keeps track of the mint count for the minter address
  mapping(address => uint256) private _addressToMintCount;

  /**
   * @notice Emits an event when an advisor have minted
   */
  event KeyAdvisorMinted(address indexed sender);

  /**
   * @notice Emits an event when a whitelisted user have minted
   */
  event KeyWhitelistMinted(address indexed sender);

  /**
   * @notice Emits an event when someone have minted after the sale
   */
  event KeyPublicMinted(address indexed sender);

  /**
   * @notice Emits an event when a key has been swapped for a scroll
   */
  event KeySwapped(address indexed sender, uint256 indexed tokenId);

  /**
   * @notice Emits an event when a new Keys contract address has been set
   */
  event NewKeysAddress(address indexed keys);

  /**
   * @notice Emits an event when a new Scroll contract address has been set
   */
  event NewScrollAddress(address indexed scroll);

  /// @notice When a new whitelist merkle root is set
  event NewWhitelistMerkleRootSet(uint256 indexed timestamp);

  /// @notice When a new advisory merkle root is set
  event NewAdvisoryMerkleRootSet(uint256 indexed timestamp);

  /**
   * @param _whitelistMerkleRoot The merkle root of whitelisted candidates
   * @param _advisorMerkleRoot The merkle root of advisor addresses
   * @param _startSaleBlockTimestamp The start sale timestamp
   * @param _stopSaleBlockTimestamp The stop sale timestamp
   */
  constructor(
    bytes32 _whitelistMerkleRoot,
    bytes32 _advisorMerkleRoot,
    uint256 _startSaleBlockTimestamp,
    uint256 _stopSaleBlockTimestamp,
    address _publicVerification,
    IERC20 _WETH
  ) {
    require(_startSaleBlockTimestamp >= block.timestamp, "Invalid start date");
    require(
      _stopSaleBlockTimestamp >= block.timestamp &&
        _stopSaleBlockTimestamp > _startSaleBlockTimestamp,
      "Invalid stop date"
    );

    publicVerificationAddress = _publicVerification;
    whitelistMerkleRoot = _whitelistMerkleRoot;
    advisorMerkleRoot = _advisorMerkleRoot;

    startSaleBlockTimestamp = _startSaleBlockTimestamp;
    stopSaleBlockTimestamp = _stopSaleBlockTimestamp;
    WETH = _WETH;
  }

  /**
   * @notice Validates if the given address is not an empty address
   */
  modifier notAddressZero(address _address) {
    require(address(0x0) != _address, "Must not be an empty address");
    _;
  }

  /**
   * @notice Validates if the current block timestamp is still under the sale timestamp range
   */
  modifier isSaleOnGoing() {
    require(
      block.timestamp >= startSaleBlockTimestamp,
      "Sale has not started yet"
    );
    require(block.timestamp <= stopSaleBlockTimestamp, "Sale is over");
    _;
  }

  /**
   * @notice Validates if the current block timestamp is outside the sale timestamp range
   */
  modifier hasSaleEnded() {
    require(saleEnded(), "Sale is ongoing");
    _;
  }

  /**
   * @dev Lookup function to check if the Alpha Sale is on-going.
   */
  function saleOnGoing() public view returns (bool) {
    return
      block.timestamp >= startSaleBlockTimestamp &&
      block.timestamp <= stopSaleBlockTimestamp;
  }

  /**
   * @dev Lookup function to check if the Alpha Sale has ended.
   */
  function saleEnded() public view returns (bool) {
    return block.timestamp > stopSaleBlockTimestamp;
  }

  /**
   * @dev Gets the current mint count of an address.
   * @param minter The minter's address
   */
  function getAddressMintCount(address minter) external view returns (uint256) {
    return _addressToMintCount[minter];
  }

  /**
   * @dev Checks if the advisory address have already claimed.
   */
  function advisoryAddressToClaimed(address _address)
    external
    view
    returns (bool)
  {
    return _advisoryAddressToClaimed[_address];
  }

  /**
   * @dev Checks if the alpha sale whitelister address have already claimed.
   */
  function publicSaleWhitelisterToClaimed(address _address)
    external
    view
    returns (bool)
  {
    return _publicSaleWhitelisterToClaimed[_address];
  }

  /**
   * @dev Checks if the given address have already claimed 3 times.
   */
  function addressToMaxClaimed(address _address) external view returns (bool) {
    return _addressToMintCount[_address] == uint256(3);
  }

  /**
   * @dev Checks if the sender is whitelisted
   */
  function isAlphaSaleWhitelist(bytes32[] calldata _proof)
    public
    view
    returns (bool)
  {
    return MerkleProof.verify(_proof, whitelistMerkleRoot, _leaf(msg.sender));
  }

  /**
   * @dev Checks if the sender is whitelisted
   */
  function isAdvisoryWhitelist(bytes32[] calldata _proof)
    public
    view
    returns (bool)
  {
    return MerkleProof.verify(_proof, advisorMerkleRoot, _leaf(msg.sender));
  }

  /// @notice compares the recovered signer address using the hash to the public address of the signing key
  function matchAddressSigner(bytes32 hash, bytes memory signature)
    public
    view
    returns (bool)
  {
    return ECDSA.recover(hash, signature) == (publicVerificationAddress);
  }

  /**
   * @notice Mints key, and sends them to the calling user if they are in the Advisory Whitelist
   * @param _proof Merkle proof for the advisory list merkle root
   */
  function advisoryMint(bytes32[] calldata _proof)
    external
    whenNotPaused
    nonReentrant
  {
    require(
      MerkleProof.verify(_proof, advisorMerkleRoot, _leaf(msg.sender)),
      "Not in the advisory list"
    );
    require(!_advisoryAddressToClaimed[msg.sender], "Already claimed");
    require(
      advisoryKeyLimitCount < ADVISORY_KEY_LIMIT,
      "Advisory mint limit reached"
    );

    advisoryKeyLimitCount++;
    _advisoryAddressToClaimed[msg.sender] = true;
    _addressToMintCount[msg.sender]++;

    _magicalkeysContract.mintKeyToUser(msg.sender);

    emit KeyAdvisorMinted(msg.sender);
  }

  /**
   * @notice For buying during the public sale, for whitelisted addresses for the sale
   * @param _proof Merkle proof for the whitelist merkle root
   */
  function buyKeyFromSale(bytes32[] calldata _proof)
    external
    nonReentrant
    isSaleOnGoing
  {
    require(
      MerkleProof.verify(_proof, whitelistMerkleRoot, _leaf(msg.sender)),
      "Not eligible"
    );
    require(!_publicSaleWhitelisterToClaimed[msg.sender], "Already claimed");
    require(publicKeyMintCount < PUBLIC_KEY_LIMIT, "All minted");
    require(
      WETH.transferFrom(msg.sender, address(this), MINT_PRICE),
      "Not allowed or low funds"
    );

    publicKeyMintCount++;
    _publicSaleWhitelisterToClaimed[msg.sender] = true;
    _addressToMintCount[msg.sender]++;

    _magicalkeysContract.mintKeyToUser(msg.sender);

    emit KeyWhitelistMinted(msg.sender);
  }

  /**
   * @notice
   * For general public to mint tokens, who weren't listed in the
   * whitelist. Will only work for a max of 9696 keys.
   */
  function buyKeyPostSale(string calldata nonce, bytes calldata signature)
    external
    nonReentrant
    hasSaleEnded
    whenNotPaused
  {
    require(publicKeyMintCount < PUBLIC_KEY_LIMIT, "Mint limit reached");
    require(
      matchAddressSigner(hashTransaction(msg.sender, nonce), signature),
      "Signature Verification Failed"
    );
    require(_addressToMintCount[msg.sender] <= 3, "You can only mint 3 times.");
    require(!_usedNonces[nonce], "Hash Already Used");
    require(
      WETH.transferFrom(msg.sender, address(this), MINT_PRICE),
      "Not allowed or low funds"
    );

    _usedNonces[nonce] = true;
    publicKeyMintCount++;
    _addressToMintCount[msg.sender]++;

    _magicalkeysContract.mintKeyToUser(msg.sender);

    emit KeyPublicMinted(msg.sender);
  }

  /**
   * @notice To swap the key for scroll on reveal
   */
  function sellKeyForScroll(uint256 _tokenId)
    external
    nonReentrant
    whenNotPaused
  {
    _magicalkeysContract.burnKeyOfUser(_tokenId, msg.sender);

    bool isAdvisoryMinter = _advisoryAddressToClaimed[msg.sender];

    _foundingAtlanteanScrollsContract.mint(msg.sender, isAdvisoryMinter);

    emit KeySwapped(msg.sender, _tokenId);
  }

  /**
   * @notice Minting unminted tokens to treasury
   * @dev EIP2309 hasn't been implemented due to lack of clarity on implementation. The EIP only specifies the event, not the implementation.
   * @param _treasuryAddress The treasury address for Atlantis World
   */
  function mintLeftOvers(address _treasuryAddress)
    external
    onlyOwner
    whenNotPaused
  {
    for (
      uint256 i = 0;
      i < TOTAL_SUPPLY - (publicKeyMintCount + advisoryKeyLimitCount);
      i++
    ) _magicalkeysContract.mintKeyToUser(_treasuryAddress);

    _advisoryAddressToClaimed[_treasuryAddress] = true;
    publicKeyMintCount = PUBLIC_KEY_LIMIT;
    advisoryKeyLimitCount = ADVISORY_KEY_LIMIT;
  }

  /// @notice to generate the hash using the nonce and the msg.sender
  function hashTransaction(address sender, string memory nonce)
    private
    pure
    returns (bytes32)
  {
    bytes32 hash = keccak256(abi.encodePacked(sender, nonce));

    return ECDSA.toEthSignedMessageHash(hash);
  }

  // *************
  // SET FUNCTIONS
  // *************

  /**
   * @notice Sets a new merkle root for all whitelisted addresses
   */
  function setWhitelistMerkleRoot(bytes32 _merkleRoot) external onlyOwner {
    whitelistMerkleRoot = _merkleRoot;

    emit NewWhitelistMerkleRootSet(block.timestamp);
  }

  /**
   * @notice Sets a new merkle root for the advisory list
   */
  function setAdvisorMerkleRoot(bytes32 _merkleRoot) external onlyOwner {
    advisorMerkleRoot = _merkleRoot;

    emit NewAdvisoryMerkleRootSet(block.timestamp);
  }

  /**
   * @dev Set a new value for public verification address
   */
  function setPublicVerificationAddress(address _publicVerificationAddress)
    external
    onlyOwner
  {
    publicVerificationAddress = _publicVerificationAddress;
  }

  /**
   * @param _address Key contract address
   */
  function setKeysAddress(address _address)
    external
    onlyOwner
    notAddressZero(_address)
  {
    _magicalkeysContract = IAtlantisWorldMagicalKeys(_address);

    emit NewKeysAddress(_address);
  }

  /**
   * @param _address Scroll contract address
   */
  function setScrollAddress(address _address)
    external
    onlyOwner
    notAddressZero(_address)
  {
    _foundingAtlanteanScrollsContract = IAtlantisWorldFoundingAtlanteanScrolls(
      _address
    );

    emit NewScrollAddress(_address);
  }

  function setWETHAddress(address _address) external onlyOwner {
    WETH = IERC20(_address);
  }

  // ***************
  // PAUSE FUNCTIONS
  // ***************

  function pauseContract() external onlyOwner whenNotPaused {
    _pause();
  }

  function unpauseContract() external onlyOwner whenPaused {
    _unpause();
  }

  /**
   * @param _sender The address whose leaf hash needs to be generated
   * @return The hash value of the sender address
   */
  function _leaf(address _sender) internal pure returns (bytes32) {
    return keccak256(abi.encodePacked(_sender));
  }

  /**
   * @dev Set the address to where funds gets transferred into.
   */
  function setWithdrawalAddress(address _targetAddress) external onlyOwner {
    targetAddress = _targetAddress;
  }

  /**
   * @dev Withdraws the amount of funds received to the `targetAddress`
   */
  function withdraw() external onlyOwner {
    require(msg.sender == targetAddress, "Not the assigned address.");
    require(
      targetAddress != address(0),
      "The assigned address is an empty address."
    );

    WETH.transfer(targetAddress, WETH.balanceOf(address(this)));
  }
}