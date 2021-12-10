// non-transferable
// burned from scroll contract
// 6969

pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Address.sol";

contract Keys is ERC721Enumerable, AccessControl, Ownable {
  using Address for address;
  using Strings for uint256;

  bytes32 public constant MINT = keccak256("MINT");
  bytes32 public constant BURN = keccak256("BURN");

  uint256 private count = 0;

  /**
   * @dev Initializes the contract by setting a `name` and a `symbol` to the token collection.
   */
  constructor(address saleContract) ERC721("Keys", "Key") {
    grantRole(MINT, saleContract);
    grantRole(BURN, saleContract);
  }

  /**
   * @dev See {IERC165-supportsInterface}.
   */
  function supportsInterface(bytes4 interfaceId)
    public
    view
    override(ERC721Enumerable, AccessControl)
    returns (bool)
  {
    return
      interfaceId == type(IERC721).interfaceId ||
      interfaceId == type(IERC721Metadata).interfaceId ||
      super.supportsInterface(interfaceId);
  }

  function transferFrom(
    address from,
    address to,
    uint256 tokenId
  ) public override {}

  function safeTransferFrom(
    address from,
    address to,
    uint256 tokenId
  ) public override {}

  function safeTransferFrom(
    address from,
    address to,
    uint256 tokenId,
    bytes memory _data
  ) public override {}

  function _safeTransfer(
    address from,
    address to,
    uint256 tokenId,
    bytes memory _data
  ) internal override {}

  function mintKeyToUser(address user) public onlyRole(MINT) {
    require(count <= 6969, "All 6969 tokens have been minted");
    _safeMint(user, count);
    count++;
  }

  function burnKeyOfUser(uint256 tokenId, address user) public onlyRole(BURN) {
    require(ownerOf(tokenId) == user, "Not the owner of the NFT");
    _burn(tokenId);
  }
}
