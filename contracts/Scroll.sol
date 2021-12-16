pragma solidity ^0.8.4;

import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721Enumerableupgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import { OwnableUpgradeable } from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "./interface/IScroll.sol";

/// @title Scroll Contract, for managing the behaviour of ERC721 Scroll.
/// @notice Contract is used for tracking the Scrolls claimed.
/// @dev the contract is made upgradaeble using OpenZeppelin Upgadaeble Library

contract ScrollContract is
  IScroll,
  ERC721EnumerableUpgradeable,
  AccessControlUpgradeable,
  OwnableUpgradeable
{
  bytes32 public constant SALE = keccak256("SALE");

  string baseURI = "";

  mapping(address => mapping(uint256 => Scroll)) private UserScroll;

  function initialize(address mintContract) public initializer {
    grantRole(SALE, mintContract);
    __ERC721_init("Scroll", "SCR");
  }

  ///  @notice Function to mint the scroll to user. Called by the sale contract after burning the key.

  function mint(address user, uint256 tokenId) public onlyRole(SALE) {
    _safeMint(user, tokenId);
  }

  /// @notice to set the BaseURI value
  function _baseURI() internal view override returns (string memory) {
    return baseURI;
  }

  /// @notice to set the BaseURI value
  function setTokenURI(string calldata uri) public onlyOwner {
    baseURI = uri;
  }

  /// @dev to get Scroll Contruct Regarding a particular NFT

  function getUserTokenDetails(address user, uint256 tokenId)
    public
    view
    returns (Scroll memory)
  {
    return UserScroll[user][tokenId];
  }

  /**
   * @dev See {IERC165-supportsInterface}.
   */

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
