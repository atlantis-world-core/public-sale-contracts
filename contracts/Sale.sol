// dutch mint amount
// keys to be minted - admin control
// 0.2 eth -> drop by 0.01  based on block.timestamp
// withdraw function
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { IKeys } from "./interface/IKeys.sol";
import { IScroll } from "./interface/IScroll.sol";

contract Sale is Ownable {
  bytes32 private whiteListMerkleRoot;
  bytes32 private advisorMerkleRoot;

  uint256 public price = 0.05 ether;
  uint256 public startSaleBlockTimestamp = 1830000000;
  uint256 public stopSaleBlockTimestamp = 1830100000;

  IKeys internal keys;
  IScroll internal scroll;

  constructor(
    IKeys _key,
    IScroll _scroll,
    bytes32 _whiteListMerkleRoot,
    bytes32 _advisorMerkleRoot
  ) {
    keys = _key;
    whiteListMerkleRoot = _whiteListMerkleRoot;
    advisorMerkleRoot = _advisorMerkleRoot;
    scroll = _scroll;
  }

  modifier isSaleOngoing() {
    require(
      block.timestamp >= startSaleBlockTimestamp,
      "Sale has not started yet"
    );
    require(block.timestamp <= stopSaleBlockTimestamp, "Sale is over");
    _;
  }

  function leaf(address sender) internal pure returns (bytes32) {
    return keccak256(abi.encodePacked(sender));
  }

  function preMint(bytes32[] calldata proof) external {
    require(
      MerkleProof.verify(proof, advisorMerkleRoot, leaf(msg.sender)),
      "not in the advisory list"
    );
    keys.mintKeyToUser(msg.sender);
  }

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

    keys.mintKeyToUser(msg.sender);
  }

  function sellKeyForSale(uint256 _tokenId) external {
    keys.burnKeyOfUser(_tokenId, msg.sender);
    scroll.mint(msg.sender, _tokenId);
  }

  function setWhiteListMerkleRoot(bytes32 _newWhiteList) external onlyOwner {
    whiteListMerkleRoot = _newWhiteList;
  }

  function setAdvisorMerkleRoot(bytes32 _advisorMerkleRoot) external onlyOwner {
    advisorMerkleRoot = _advisorMerkleRoot;
  }

  function setKeysAddress(IKeys _keys) external {
    keys = _keys;
  }

  function setScollAddress(IScroll _scroll) external {
    scroll = _scroll;
  }
}
