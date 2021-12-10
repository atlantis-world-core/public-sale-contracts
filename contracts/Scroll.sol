// total - 6969
// mint -> burn the key to mint
// rarity -> 1% elder scrolls, special aesthtic, secret future perks, associate guilds => single struct

pragma solidity ^0.8.4;

import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721Enumerableupgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import { OwnableUpgradeable } from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "./interface/IScroll.sol";

contract ERC721Scroll is
  IScroll,
  ERC721EnumerableUpgradeable,
  AccessControlUpgradeable,
  OwnableUpgradeable
{
  bytes32 public constant MINT = keccak256("MINT");

  string baseURI = "";

  mapping(address => mapping(uint256 => Scroll)) private UserScroll;

  function initialize(address mintContract) public initializer {
    grantRole(MINT, mintContract);
    __ERC721_init("Scroll", "SCR");
  }

  function mint(address user, uint256 tokenId) public onlyRole(MINT) {
    _safeMint(user, tokenId);
  }

  function _baseURI() internal view override returns (string memory) {
    return baseURI;
  }

  function setTokenURI(string calldata uri) public {
    baseURI = uri;
  }

  function getUserTokenDetails(address user, uint256 tokenId)
    public
    view
    returns (Scroll memory)
  {
    return UserScroll[user][tokenId];
  }

  function supportsInterface(bytes4 interfaceId)
    public
    view
    override(ERC721EnumerableUpgradeable, AccessControlUpgradeable)
    returns (bool)
  {
    return
      interfaceId == type(IERC721Upgradeable).interfaceId ||
      interfaceId == type(IERC721MetadataUpgradeable).interfaceId ||
      super.supportsInterface(interfaceId);
  }
}
