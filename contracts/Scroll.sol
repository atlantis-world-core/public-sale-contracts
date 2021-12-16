// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "./interface/IScroll.sol";

/// @title Scroll Contract, for managing the behaviour of ERC721 Scroll.
/// @author Rachit Anand Srivastava
/// @notice Contract is used for tracking the Scrolls claimed.
/// @dev the contract is made upgradaeble using OpenZeppelin Upgadaeble Library
contract ScrollContract is
  IScroll,
  ERC721EnumerableUpgradeable,
  AccessControlUpgradeable,
  OwnableUpgradeable
{
  bytes32 public constant SALE_CONTRACT_ROLE = keccak256("SALE");

  string internal baseURI;

  function initialize(address _saleContract) public initializer {
    _setupRole(SALE_CONTRACT_ROLE, _saleContract);
    _setRoleAdmin(SALE_CONTRACT_ROLE, DEFAULT_ADMIN_ROLE);
    // grantRole(SALE, _saleContract);
    __ERC721_init("Scroll", "SCR");
  }

  ///  @notice Function to mint the scroll to user. Called by the sale contract after burning the key.
  function mint(address user, uint256 tokenId)
    public
    override
    onlyRole(SALE_CONTRACT_ROLE)
  {
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

  /// @dev See {IERC165-supportsInterface}.
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
