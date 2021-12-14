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
    event AdvisorMinted(address sender);

    /// @notice Emits an event when a whitelisted user have minted
    event KeyPurchasedOnSale(address sender);

    /// @notice Emits an event when someone have minted after the sale
    event KeyPurchasedOnPostSale(address sender);

    /// @notice Emits an event when a key has been swapped for a scroll
    event KeySwapped(address sender, uint256 tokenId);

    event NewWhitelistMerkleRoot(bytes32 merkleRoot);

    event NewAdvisorMerkleRoot(bytes32 merkleRoot);

    event NewKeysAddress(address keys);

    event NewScrollAddress(address scroll);

    event NewStartKeyToScrollSwap(uint256 timestamp);

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

    modifier canAffordMintPrice() {
        require(msg.value >= mintPrice, "Insufficient payment");
        _;
    }

    modifier isWhitelisted(bytes32[] calldata _proof) {
        require(
            MerkleProof.verify(
                _proof,
                whitelistMerkleRoot,
                generateLeaf(msg.sender)
            ),
            "You weren't whitelisted"
        );
        _;
    }

    modifier isAdvisor(bytes32[] calldata _proof) {
        require(
            MerkleProof.verify(
                _proof,
                advisorMerkleRoot,
                generateLeaf(msg.sender)
            ),
            "Not in the advisory list"
        );
        _;
    }

    /// @param _sender The address whose leaf hash needs to be generated
    /// @return leaf The hash value of the sender address
    function generateLeaf(address _sender) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(_sender));
    }

    /// @notice Mints key, and sends them to the calling user if they are in the Advisory Whitelist
    /// @param _proof The merkle proof for the Advisory Merkle Tree
    function preMint(bytes32[] calldata _proof) external isAdvisor(_proof) {
        keysContract.mintKeyToUser(msg.sender);

        emit AdvisorMinted(msg.sender);
    }

    /// @notice For buying during the public sale, for addresses whitelisted for the sale
    /// @param _proof The merkle proof for the `whitelistMerkleRoot`
    function buyKeyFromSale(bytes32[] calldata _proof)
        external
        payable
        isSaleOnGoing
        isWhitelisted(_proof)
        canAffordMintPrice
    {
        keysContract.mintKeyToUser(msg.sender);

        emit KeyPurchasedOnSale(msg.sender);
    }

    /// @notice For general public to mint tokens, who weren't listed in the whitelist. Will only work for a max of 6969 keys
    function buyKeyPostSale() public payable hasSaleEnded canAffordMintPrice {
        keysContract.mintKeyToUser(msg.sender);

        emit KeyPurchasedOnPostSale(msg.sender);
    }

    /// @notice To swap the key for scroll on reveal
    function sellKeyForScroll(uint256 _tokenId) external canKeySwapped {
        keysContract.burnKeyOfUser(_tokenId, msg.sender);

        scrollContract.mint(msg.sender, _tokenId);

        emit KeySwapped(msg.sender, _tokenId);
    }

    // *************
    // SET FUNCTIONS
    // *************

    /// @notice It sets the timestamp for when key swapping for scrolls is available
    /// @dev I noticed that the property `startKeyToScrollSwapTimestamp` was never set anywhere else
    /// TODO: To verify with the team if do we need to be able to set the timestamp for key swapping anytime or just once?
    function setStartKeyToScrollSwapTimestamp(
        uint256 _startKeyToScrollSwapTimestamp
    ) external onlyOwner {
        startKeyToScrollSwapTimestamp = _startKeyToScrollSwapTimestamp;

        emit NewStartKeyToScrollSwap(_startKeyToScrollSwapTimestamp);
    }

    function setWhitelistMerkleRoot(bytes32 _whitelistMerkleRoot)
        external
        onlyOwner
    {
        whitelistMerkleRoot = _whitelistMerkleRoot;

        emit NewWhitelistMerkleRoot(_whitelistMerkleRoot);
    }

    function setAdvisorMerkleRoot(bytes32 _advisorMerkleRoot)
        external
        onlyOwner
    {
        advisorMerkleRoot = _advisorMerkleRoot;

        emit NewAdvisorMerkleRoot(_advisorMerkleRoot);
    }

    /// @param _address Key contract address
    function setKeysAddress(address _address) external onlyOwner {
        keysContract = IKeys(_address);

        emit NewKeysAddress(_address);
    }

    /// @param _address Scroll contract address
    function setScollAddress(address _address) external onlyOwner {
        scrollContract = IScroll(_address);

        emit NewScrollAddress(_address);
    }
}
