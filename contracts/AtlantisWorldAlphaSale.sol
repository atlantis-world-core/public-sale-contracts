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
 * ▄▀█ ▀█▀ █░░ ▄▀█ █▄░█ ▀█▀ █ █▀   █░█░█ █▀█ █▀█ █░░ █▀▄
 * █▀█ ░█░ █▄▄ █▀█ █░▀█ ░█░ █ ▄█   ▀▄▀▄▀ █▄█ █▀▄ █▄▄ █▄▀
 *
 *
 * Atlantis World is building the Web3 social metaverse by connecting Web3 with social, 
 * gaming and education in one lightweight virtual world that's accessible to everybody.
 *
 * # CJ Hetherington
 * 
 * “I’m forever a man indebted to the great and fantastically talented builders 
 * beside me here that have made Atlantis World an (almost) reality. As I look 
 * back on the moments that have shaped me as the years have gone by, I’ve never 
 * been so transformed by the magic felt as I joined hands and minds with Rev, Julio, 
 * Ilayda, Austyn, Rachit, Carlo, Chris and Eylul. I love you all folks, it’s great 
 * to be learning and growing whilst cultivating this movement all together. 
 * We’re just getting started, this is just the beginning, and it’s time to reach 
 * terminal velocity. It’s going to be a wild ride, so strap in. Let’s do everything 
 * in our power to always over deliver and never let down those who have supported us 
 * and will continue to. Greatness depends on what we do next. Let’s DAO it, frens!”
 *
 * # Rev Miller
 * 
 * “Living in a world of prosperity, freedom, and joy - the world that’s true to your 
 * beliefs and values, the world that creates abundance for everyone involved and helps 
 * those in need. the world where kindness, integrity, intelligence, and energy are met. 
 * The world of constant exploration, experimentation, and growth. that’s the world most 
 * of us want to live in, the world we want to grow and build for future generations. All 
 * while being whoever we wanted to be, contributing to something bigger than ourselves, 
 * and giving it everything we’ve got. that’s the world we’re building together - with the team, 
 * the community, our whole family behind Atlantis World - the world we all deserve.”
 *
 * # Julio Alcantara
 *
 * “We all come from different walks of life and think we cannot do great things. But 
 * adventure is just waiting out there for anyone. You just need to stay positive and 
 * look for youir moment. When that time comes, you better be ready to give it your all. 
 * Alone we are but droplets, but together we are an endless Ocean!”
 *
 * # Ilayda Pinarbasi
 *
 * “...”
 * 
 * # Rachit Srivastava
 *
 * “"Let us step into the night and pursue that flighty temptress, adventure". - J.K Rowling 
 *  Metaverse is the future of technology, and I see Atlantis world to be the among the core project 
 *  in the space. WAGMI!” 
 *
 * # Austyn Studdard
 *
 * “...”
 * 
 * # Chris Diperio
 *
 * “...”
 *
 * # Carlo Miguel Dy
 *
 * “We're building together for the decentralized future!”
 *
 * # Eylul Civelek
 *
 * “Atlantis World is such a rare kind of project to work on. I couldn't have asked for a better team to 
 * be part of. We were born to make history together!”
 *
 *
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

  /// @notice When a left over public magical key gets minted to `treasuryAddress`
  event MintLeftOverPublicMagicalKey(address indexed treasuryAddress);

  /// @notice When a left over advisory magical key gets minted to `treasuryAddress`
  event MintLeftOverAdvisoryMagicalKey(address indexed treasuryAddress);

  /// @notice When a new start timestamp is added
  event NewStartTime(uint256 indexed timestamp);

  /// @notice When a new end timestamp is added
  event NewEndTime(uint256 indexed timestamp);

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
    public
    nonReentrant
    whenNotPaused
  {
    _magicalkeysContract.burnKeyOfUser(_tokenId, msg.sender);

    bool isAdvisoryMinter = _advisoryAddressToClaimed[msg.sender];

    _foundingAtlanteanScrollsContract.mint(msg.sender, isAdvisoryMinter);

    emit KeySwapped(msg.sender, _tokenId);
  }

  /**
   * @notice Minting unminted advisory tokens to treasury
   * @dev EIP2309 hasn't been implemented due to lack of clarity on implementation. The EIP only specifies the event, not the implementation.
   * @param _treasuryAddress The treasury address for Atlantis World
   */
  function mintLeftOverAdvisoryKey(address _treasuryAddress)
    external
    onlyOwner
    whenNotPaused
  {
    require(
      _treasuryAddress != address(0),
      "The assigned address is an empty address."
    );
    require(advisoryKeyLimitCount <= ADVISORY_KEY_LIMIT);

    advisoryKeyLimitCount++;

    _magicalkeysContract.mintKeyToUser(_treasuryAddress);

    emit MintLeftOverAdvisoryMagicalKey(_treasuryAddress);
  }

  /**
   * @notice Minting unminted public tokens to treasury
   * @dev EIP2309 hasn't been implemented due to lack of clarity on implementation. The EIP only specifies the event, not the implementation.
   * @param _treasuryAddress The treasury address for Atlantis World
   */
  function mintLeftOverPublicKey(address _treasuryAddress)
    external
    onlyOwner
    whenNotPaused
  {
    require(
      _treasuryAddress != address(0),
      "The assigned address is an empty address."
    );
    require(publicKeyMintCount <= PUBLIC_KEY_LIMIT);

    publicKeyMintCount++;

    _magicalkeysContract.mintKeyToUser(_treasuryAddress);

    emit MintLeftOverPublicMagicalKey(_treasuryAddress);
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

  /// @notice Safety function to set the WETH Contract Address
  function setWETHAddress(address _address) external onlyOwner {
    WETH = IERC20(_address);
  }

  /// @notice Set the sale start time
  function setStartTime(uint256 _startTimeStamp) external onlyOwner {
    require(_startTimeStamp >= block.timestamp, "Invalid start date");

    startSaleBlockTimestamp = _startTimeStamp;

    emit NewStartTime(_startTimeStamp);
  }

  /// @notice Set the sale end time
  function setEndTime(uint256 _stopTimeStamp) external onlyOwner {
    require(
      _stopTimeStamp >= block.timestamp &&
        _stopTimeStamp > startSaleBlockTimestamp,
      "Invalid stop date"
    );

    stopSaleBlockTimestamp = _stopTimeStamp;

    emit NewEndTime(_stopTimeStamp);
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
