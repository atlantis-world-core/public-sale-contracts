// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IKeys} from "./interface/IKeys.sol";
import {IScroll} from "./interface/IScroll.sol";
import "hardhat/console.sol";

/// @title A controller for the entire club sale
/// @author Rachit Anand Srivastava
/// @notice Contract can be used for the claiming the keys for Atlantis World, and redeeming the keys for scrolls later
/// @dev All function calls are implemented with side effects on the key and scroll contracts
contract Sale is Ownable {
  /// @notice All the merkle roots - whitelist address and advisor addresses
  bytes32 private whitelistMerkleRoot;
  bytes32 private advisorMerkleRoot;

  uint256 public mintPrice = 0.2 ether;

  /// @notice 6666+303=6969 Total Supply
  uint256 public constant PUBLICKEYLIMIT = 6666;
  uint256 public constant ADVISORYKEYLIMIT = 303;

  uint256 publicKeyMintCount = 0;
  uint256 advisoryKeyLimitCount = 0;

  /// @notice Timestamps
  uint256 public startSaleBlockTimestamp;
  uint256 public stopSaleBlockTimestamp;
  uint256 public startKeyToScrollSwapTimestamp;

  /// @notice key contracts
  IKeys internal keysContract;
  IScroll internal scrollContract;

  /// @param _whitelistMerkleRoot The merkle root of whitelisted candidates
  /// @param _advisorMerkleRoot The merkle root of advisor addresses
  /// @param _startSaleBlockTimestamp The start sale timestamp
  /// @param _stopSaleBlockTimestamp The stop sale timestamp
  constructor(
    bytes32 _whitelistMerkleRoot,
    bytes32 _advisorMerkleRoot,
    uint256 _startSaleBlockTimestamp,
    uint256 _stopSaleBlockTimestamp
  ) {
    whitelistMerkleRoot = _whitelistMerkleRoot;
    advisorMerkleRoot = _advisorMerkleRoot;

    startSaleBlockTimestamp = _startSaleBlockTimestamp;
    stopSaleBlockTimestamp = _stopSaleBlockTimestamp;
  }

  /// @notice Emits an event when an advisor have minted
  event KeyAdvisorMinted(address sender);

  /// @notice Emits an event when a whitelisted user have minted
  event KeyPurchasedOnSale(address sender);

  /// @notice Emits an event when someone have minted after the sale
  event KeyPurchasedOnPostSale(address sender);

  /// @notice Emits an event when a key has been swapped for a scroll
  event KeySwapped(address sender, uint256 tokenId);

  event NewKeysAddress(address keys);

  event NewScrollAddress(address scroll);

  event NewStartKeyToScrollSwapTimestamp(uint256 timestamp);

  modifier validAddress(address _address) {
    require(address(0) != _address, "Must not be an empty address");
    _;
  }

  modifier isSaleOnGoing() {
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
    // TODO: To verify with team
    require(
      startKeyToScrollSwapTimestamp != 0,
      "A date for swapping hasn't been set"
    );
    require(
      block.timestamp >= startKeyToScrollSwapTimestamp,
      "Please wait for the swapping to begin"
    );
    _;
  }

  ///  @notice - For general public to mint tokens, who weren't listed in the whitelist. Will only work for a max of 6666 keys

  function buyPostSale() public payable hasSaleEnded {
    require(msg.value >= mintPrice, "Insufficient payment");
    require(publicKeyMintCount < PUBLICKEYLIMIT, "Mint Limit Reached");
    publicKeyMintCount++;
    keysContract.mintKeyToUser(msg.sender);
  }

  /// @notice For general public to mint tokens, who weren't listed in the whitelist. Will only work for a max of 6969 keys
  function buyKeyPostSale() public payable hasSaleEnded {
    require(msg.value >= mintPrice, "Insufficient payment");

    keysContract.mintKeyToUser(msg.sender);

    emit KeyPurchasedOnPostSale(msg.sender);
  }

  /// @notice To swap the key for scroll on reveal
  function sellKeyForScroll(uint256 _tokenId) external canKeySwapped {
    keysContract.burnKeyOfUser(_tokenId, msg.sender);

    scrollContract.mint(msg.sender, _tokenId);

    emit KeySwapped(msg.sender, _tokenId);
  }

  /// @notice minting unminted tokens to treasury
  function mintLeftOvers(address owner) external onlyOwner {
    // TODO : EIP 2809 implementation
    for (
      uint256 i = 0;
      i < 6969 - (publicKeyMintCount + advisoryKeyLimitCount);
      i++
    ) keysContract.mintKeyToUser(owner);

    publicKeyMintCount = 6666;
    advisoryKeyLimitCount = 303;
  }

  // *************
  // SET FUNCTIONS
  // *************

  /// @notice It sets the timestamp for when key swapping for scrolls is available
  /// @dev I noticed that the property `startKeyToScrollSwapTimestamp` was never set anywhere else
  /// TODO: To verify with the team if do we need to be able to set the timestamp for key swapping anytime or just once?
  function setStartKeyToScrollSwapTimestamp(uint256 _timestamp)
    external
    onlyOwner
  {
    startKeyToScrollSwapTimestamp = _timestamp;

    emit NewStartKeyToScrollSwapTimestamp(_timestamp);
  }

  function setWhitelistMerkleRoot(bytes32 _merkleRoot) external onlyOwner {
    whitelistMerkleRoot = _merkleRoot;
  }

  function setAdvisorMerkleRoot(bytes32 _merkleRoot) external onlyOwner {
    advisorMerkleRoot = _merkleRoot;
  }

  /// @param _address Key contract address
  function setKeysAddress(address _address)
    external
    onlyOwner
    validAddress(_address)
  {
    keysContract = IKeys(_address);

    emit NewKeysAddress(_address);
  }

  /// @param _address Scroll contract address
  function setScollAddress(address _address)
    external
    onlyOwner
    validAddress(_address)
  {
    scrollContract = IScroll(_address);

    emit NewScrollAddress(_address);
  }

  function setStartKeyScrollSwap(uint256 _startKeyToScroll) external onlyOwner {
    startKeyToScrollSwapTimestamp = _startKeyToScroll;
  }
}
