pragma solidity ^0.8.4;

import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { IKeys } from "./interface/IKeys.sol";
import { IScroll } from "./interface/IScroll.sol";

/// @title A controller for the entire club sale
/// @author Rachit Anand Srivastava
/// @notice Contract can be used for the claiming the keys for Atlantis World, and redeeming the keys for scrolls later
/// @dev All function calls are implemented with side effects on the key and scroll contracts

contract Sale is Ownable {
  /// @notice all the merkle roots - whitelist address and advisor addresses
  bytes32 private whiteListMerkleRoot;
  bytes32 private advisorMerkleRoot;

  uint256 public price = 0.2 ether;

  /// @notice 6666+303=6969 Total Supply
  uint256 public constant PUBLICKEYLIMIT = 6666;
  uint256 public constant ADVISORYKEYLIMIT = 303;

  uint256 publicKeyMintCount = 0;
  uint256 advisoryKeyLimitCount = 0;

  /// @notice Timestamps
  uint256 public startSaleBlockTimestamp;
  uint256 public stopSaleBlockTimestamp;
  uint256 public startKeyToScrollSwap;

  /// @notice key contracts
  IKeys internal keys;
  IScroll internal scroll;

  /**
   * @param _whiteListMerkleRoot - merkle root of whitelisted candidates
   * @param _advisorMerkleRoot - merkle root of advisor addresses
   * @param _startSaleBlockTimestamp - start timestamp
   * @param _stopSaleBlockTimestamp - stop sale
   */

  constructor(
    bytes32 _whiteListMerkleRoot,
    bytes32 _advisorMerkleRoot,
    uint256 _startSaleBlockTimestamp,
    uint256 _stopSaleBlockTimestamp
  ) {
    whiteListMerkleRoot = _whiteListMerkleRoot;
    advisorMerkleRoot = _advisorMerkleRoot;

    startSaleBlockTimestamp = _startSaleBlockTimestamp;
    stopSaleBlockTimestamp = _stopSaleBlockTimestamp;
  }

  modifier isSaleOngoing() {
    require(
      block.timestamp >= startSaleBlockTimestamp,
      "Sale has not started yet"
    );
    require(block.timestamp <= stopSaleBlockTimestamp, "Sale is over");
    _;
  }

  modifier hasSaleEnded() {
    require(block.timestamp > stopSaleBlockTimestamp, "Sale is ongoing");
    _;
  }

  modifier canKeySwapped() {
    require(
      block.timestamp >= startKeyToScrollSwap,
      "Please wait for the swapping to begin"
    );
    _;
  }

  /**
   * @param sender - the address whose leaf hash needs to be generated
   * @return the hash value of the sender address
   */
  function leaf(address sender) internal pure returns (bytes32) {
    return keccak256(abi.encodePacked(sender));
  }

  /**
   * @notice Mints key, and sends them to the calling user if they are in the Advisory Whitelist
   * @param proof - Merkle proof for the Advisory Merkle Tree
   */
  function preMint(bytes32[] calldata proof) external {
    require(
      MerkleProof.verify(proof, advisorMerkleRoot, leaf(msg.sender)),
      "not in the advisory list"
    );
    require(advisoryKeyLimitCount < ADVISORYKEYLIMIT, "Mint Limit Reached");
    advisoryKeyLimitCount++;
    keys.mintKeyToUser(msg.sender);
  }

  /**
   * @notice - for buying during the public sale, for addresses whitelisted for the sale
   * @param proof - Merkle proof fot the whiteListMerkleRoot
   */
  function buyKeyFromSale(bytes32[] calldata proof)
    external
    payable
    isSaleOngoing
  {
    require(
      MerkleProof.verify(proof, whiteListMerkleRoot, leaf(msg.sender)),
      "Not Eligible"
    );
    require(msg.value >= price, "Insufficient payment");
    require(publicKeyMintCount < PUBLICKEYLIMIT, "Mint Limit Reached");
    publicKeyMintCount++;
    keys.mintKeyToUser(msg.sender);
  }

  ///  @notice - For general public to mint tokens, who weren't listed in the whitelist. Will only work for a max of 6666 keys

  function buyPostSale() public payable hasSaleEnded {
    require(msg.value >= price, "Insufficient payment");
    require(publicKeyMintCount < PUBLICKEYLIMIT, "Mint Limit Reached");
    publicKeyMintCount++;
    keys.mintKeyToUser(msg.sender);
  }

  /// @notice - To swap the key for scroll on reveal

  function sellKeyForScroll(uint256 _tokenId) external canKeySwapped {
    keys.burnKeyOfUser(_tokenId, msg.sender);
    scroll.mint(msg.sender, _tokenId);
  }

  /// @notice minting unminted tokens to treasury
  function mintLeftOvers(address owner) external onlyOwner {
    // TODO : EIP 2809 implementation
    for (
      uint256 i = 0;
      i < 6969 - (publicKeyMintCount + advisoryKeyLimitCount);
      i++
    ) keys.mintKeyToUser(owner);

    publicKeyMintCount = 6666;
    advisoryKeyLimitCount = 303;
  }

  // *************
  // SET FUNCTIONS
  // *************

  function setWhiteListMerkleRoot(bytes32 _newWhiteList) external onlyOwner {
    whiteListMerkleRoot = _newWhiteList;
  }

  function setAdvisorMerkleRoot(bytes32 _advisorMerkleRoot) external onlyOwner {
    advisorMerkleRoot = _advisorMerkleRoot;
  }

  /// @param _keys - key contract address
  function setKeysAddress(IKeys _keys) external onlyOwner {
    keys = _keys;
  }

  /// @param _scroll - scroll contract address
  function setScollAddress(IScroll _scroll) external onlyOwner {
    scroll = _scroll;
  }

  function setStartKeyScrollSwap(uint256 _startKeyToScroll) external onlyOwner {
    startKeyToScrollSwap = _startKeyToScroll;
  }
}
