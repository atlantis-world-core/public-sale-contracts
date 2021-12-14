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
    uint256 public startKeyToScrollSwap;

    /// @notice key contracts
    IKeys internal keys;
    IScroll internal scroll;

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

        console.log("Sale contract deployed by '%s'", owner());
    }

    /// @notice Emits an event when an advisor have minted
    event AdvisorMinted(address sender);

    /// @notice Emits an event when a whitelisted user have minted
    event UserMinted(address sender);

    /// @notice Emits an event when someone have minted after the sale
    event PostSaleMinted(address sender);

    /// @notice Emits an event when a key has been swapped for a scroll
    event KeySwapped(address sender, uint256 tokenId);

    event NewWhitelistMerkleRoot(bytes32 merkleRoot);

    event NewAdvisorMerkleRoot(bytes32 merkleRoot);

    event NewKeysAddress(IKeys keys);

    event NewScrollAddress(IScroll scroll);

    function getTimestamp() external view returns (uint256) {
        return block.timestamp;
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
        keys.mintKeyToUser(msg.sender);

        emit AdvisorMinted(msg.sender);
    }

    /// @notice For buying during the public sale, for addresses whitelisted for the sale
    /// @param _proof The merkle proof for the `whitelistMerkleRoot`
    function buyKeyFromSale(bytes32[] calldata _proof)
        external
        payable
        isSaleOngoing
        canAffordMintPrice
        isWhitelisted(_proof)
    {
        keys.mintKeyToUser(msg.sender);

        emit UserMinted(msg.sender);
    }

    /// @notice For general public to mint tokens, who weren't listed in the whitelist. Will only work for a max of 6969 keys
    function buyPostSale() public payable hasSaleEnded canAffordMintPrice {
        keys.mintKeyToUser(msg.sender);

        emit PostSaleMinted(msg.sender);
    }

    /// @notice To swap the key for scroll on reveal
    function sellKeyForScroll(uint256 _tokenId) external canKeySwapped {
        keys.burnKeyOfUser(_tokenId, msg.sender);

        scroll.mint(msg.sender, _tokenId);

        emit KeySwapped(msg.sender, _tokenId);
    }

    // *************
    // SET FUNCTIONS
    // *************

    function setWhitelistMerkleRoot(bytes32 _newWhiteList) external onlyOwner {
        whitelistMerkleRoot = _newWhiteList;

        emit NewWhitelistMerkleRoot(_newWhiteList);
    }

    function setAdvisorMerkleRoot(bytes32 _advisorMerkleRoot)
        external
        onlyOwner
    {
        advisorMerkleRoot = _advisorMerkleRoot;

        emit NewAdvisorMerkleRoot(_advisorMerkleRoot);
    }

    /// @param _keys Key contract address
    function setKeysAddress(IKeys _keys) external onlyOwner {
        keys = _keys;

        emit NewKeysAddress(_keys);
    }

    /// @param _scroll Scroll contract address
    function setScollAddress(IScroll _scroll) external onlyOwner {
        scroll = _scroll;

        emit NewScrollAddress(_scroll);
    }
}
