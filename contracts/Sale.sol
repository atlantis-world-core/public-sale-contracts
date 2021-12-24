// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IKeys} from "./interface/IKeys.sol";
import {IScroll} from "./interface/IScroll.sol";

/// @title A controller for the entire club sale
/// @notice Contract can be used for the claiming the keys for Atlantis World, and redeeming the keys for scrolls later
/// @dev All function calls are implemented with side effects on the key and scroll contracts
contract Sale is Ownable, Pausable, ReentrancyGuard {
  /**
   * @notice Key contracts
   */
  IKeys private _keysContract;
  IScroll private _scrollContract;

  /**
   * @notice All the merkle roots - whitelist address and advisor addresses
   */
  bytes32 private whitelistMerkleRoot;
  bytes32 private advisorMerkleRoot;

  /**
   * @notice The mint price for a key
   */
  uint256 public mintPrice = 0.2 ether;

  /**
   * @notice 6666 + 303 = 6969 Total Supply
   */
  uint256 public constant PUBLIC_KEY_LIMIT = 6666;
  uint256 public constant ADVISORY_KEY_LIMIT = 303;

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

  /// @notice to keep track if the advisor / user whitelisted has already claimed the NFT
  mapping(address => bool) private _publicSaleClaimedStatus;
  mapping(address => bool) private _advisoryClaimedStatus;

  /**
   * @notice The timestamp for when swapping keys for a scroll begins
   */
  uint256 public startKeyToScrollSwapTimestamp;

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
    uint256 _stopSaleBlockTimestamp
  ) {
    require(_startSaleBlockTimestamp >= block.timestamp, "Invalid start date");
    require(
      _stopSaleBlockTimestamp >= block.timestamp &&
        _stopSaleBlockTimestamp > _startSaleBlockTimestamp,
      "Invalid stop date"
    );

    whitelistMerkleRoot = _whitelistMerkleRoot;
    advisorMerkleRoot = _advisorMerkleRoot;

    startSaleBlockTimestamp = _startSaleBlockTimestamp;
    stopSaleBlockTimestamp = _stopSaleBlockTimestamp;
  }

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

  /**
   * @notice Emits an event when a timestamp for key swapping for scroll has been set
   */
  event NewStartKeyToScrollSwapTimestamp(uint256 indexed timestamp);

  /**
   * @notice Validates if the given address is not an empty address
   */
  modifier notAddressZero(address _address) {
    require(address(0x0) != _address, "Must not be an empty address");
    _;
  }

  /**
   * @notice Validates if the sender has enough ether to mint a key
   */
  modifier canAffordMintPrice() {
    require(msg.value >= mintPrice, "Insufficient payment");
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
    require(block.timestamp > stopSaleBlockTimestamp, "Sale is ongoing");
    _;
  }

  /**
   * @notice Validates if the swapping of key for a scroll is enabled or for when a date is set
   */
  modifier canKeySwapped() {
    require(
      // TODO: To verify with team
      startKeyToScrollSwapTimestamp != 0,
      "A date for swapping hasn't been set"
    );
    require(
      block.timestamp >= startKeyToScrollSwapTimestamp,
      "Please wait for the swapping to begin"
    );
    _;
  }

  /**
   * @notice Mints key, and sends them to the calling user if they are in the Advisory Whitelist
   * @param _proof Merkle proof for the advisory list merkle root
   */
  function preMint(bytes32[] calldata _proof)
    external
    whenNotPaused
    nonReentrant
  {
    require(
      MerkleProof.verify(_proof, advisorMerkleRoot, _leaf(msg.sender)),
      "Not in the advisory list"
    );
    require(!_advisoryClaimedStatus[msg.sender], "Already claimed");
    require(
      advisoryKeyLimitCount < ADVISORY_KEY_LIMIT,
      "Advisory mint limit reached"
    );

    advisoryKeyLimitCount++;
    _advisoryClaimedStatus[msg.sender] = true;

    _keysContract.mintKeyToUser(msg.sender);

    emit KeyAdvisorMinted(msg.sender);
  }

  /**
   * @notice For buying during the public sale, for whitelisted addresses for the sale
   * @param _proof Merkle proof for the whitelist merkle root
   */
  function buyKeyFromSale(bytes32[] calldata _proof)
    external
    payable
    nonReentrant
    canAffordMintPrice
    isSaleOnGoing
  {
    require(
      MerkleProof.verify(_proof, whitelistMerkleRoot, _leaf(msg.sender)),
      "Not eligible"
    );
    require(!_publicSaleClaimedStatus[msg.sender], "Already claimed");
    require(publicKeyMintCount < PUBLIC_KEY_LIMIT, "All minted");

    publicKeyMintCount++;
    _publicSaleClaimedStatus[msg.sender] = true;

    _keysContract.mintKeyToUser(msg.sender);

    emit KeyWhitelistMinted(msg.sender);
  }

  /**
   * @notice
   * For general public to mint tokens, who weren't listed in the
   * whitelist. Will only work for a max of 6969 keys.
   */
  function buyKeyPostSale()
    public
    payable
    nonReentrant
    canAffordMintPrice
    hasSaleEnded
    whenNotPaused
  {
    require(
      publicKeyMintCount + advisoryKeyLimitCount < PUBLIC_KEY_LIMIT,
      "Mint limit reached"
    );

    publicKeyMintCount++;

    _keysContract.mintKeyToUser(msg.sender);

    emit KeyPublicMinted(msg.sender);
  }

  /**
   * @notice To swap the key for scroll on reveal
   */
  function sellKeyForScroll(uint256 _tokenId)
    external
    nonReentrant
    canKeySwapped
    whenNotPaused
  {
    _keysContract.burnKeyOfUser(_tokenId, msg.sender);

    _scrollContract.mint(msg.sender, _tokenId);

    emit KeySwapped(msg.sender, _tokenId);
  }

  /**
   * @notice Minting unminted tokens to treasury
   * @param _treasuryAddress The treasury address for Atlantis World
   */
  function mintLeftOvers(address _treasuryAddress)
    external
    onlyOwner
    whenNotPaused
  {
    // TODO: EIP 2809 implementation

    for (
      uint256 i = 0;
      i < 6969 - (publicKeyMintCount + advisoryKeyLimitCount);
      i++
    ) _keysContract.mintKeyToUser(_treasuryAddress);

    publicKeyMintCount = 6666;
    advisoryKeyLimitCount = 303;
  }

  // *************
  // SET FUNCTIONS
  // *************

  /**
   * @notice It sets the timestamp for when key swapping for scrolls is available
   * @dev I noticed that the property `startKeyToScrollSwapTimestamp` was never set anywhere else
   */
  function setStartKeyToScrollSwapTimestamp(uint256 _timestamp)
    external
    onlyOwner
  {
    startKeyToScrollSwapTimestamp = _timestamp;

    emit NewStartKeyToScrollSwapTimestamp(_timestamp);
  }

  /**
   * @notice Sets a new merkle root for all whitelisted addresses
   */
  function setWhitelistMerkleRoot(bytes32 _merkleRoot) external onlyOwner {
    whitelistMerkleRoot = _merkleRoot;
  }

  /**
   * @notice Sets a new merkle root for the advisory list
   */
  function setAdvisorMerkleRoot(bytes32 _merkleRoot) external onlyOwner {
    advisorMerkleRoot = _merkleRoot;
  }

  /**
   * @param _address Key contract address
   */
  function setKeysAddress(address _address)
    external
    onlyOwner
    notAddressZero(_address)
  {
    _keysContract = IKeys(_address);

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
    _scrollContract = IScroll(_address);

    emit NewScrollAddress(_address);
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

  function withdraw(address _targetAddress) external onlyOwner {
    address payable targetAddress = payable(_targetAddress);
    targetAddress.transfer(address(this).balance);
  }
}
