// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "./interface/IScroll.sol";
import "./lib/impl/RoyaltiesV2Impl.sol";
import "./lib/LibPart.sol";
import "./lib/LibRoyaltiesV2.sol";

/// @title Scroll Contract, for managing the behaviour of ERC721 Scroll.
/// @notice Contract is used for tracking the Scrolls claimed.
/// @dev the contract is made upgradaeble using OpenZeppelin Upgadaeble Library
contract ScrollContract is
  IScroll,
  ERC721EnumerableUpgradeable,
  AccessControlUpgradeable,
  OwnableUpgradeable,
  ERC2981ContractWideRoyalties,
  RoyaltiesV2Impl
{
  bytes32 public constant SALE_CONTRACT_ROLE = keccak256("SALE");

  event UpdatedRoyalties(address newRoyaltyAddress, uint256 newPercentage);

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

  /// @notice rarity fee
  function transferFrom(
    address from,
    address to,
    uint256 tokenId
  ) public override {
    require(
      _isApprovedOrOwner(_msgSender(), tokenId),
      "ERC721: transfer caller is not owner nor approved"
    );

    _transfer(from, to, tokenId);
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

  // @notice this will use internal functions to set EIP 2981
  function setRoyaltyInfo(address _royaltyAddress, uint256 _percentage)
    public
    onlyOwner
  {
    _setRoyalties(_royaltyAddress, _percentage);
    emit UpdatedRoyalties(_royaltyAddress, _percentage);
  }

  // *********
  // ROYALTIES
  // *********

  /// @dev {EIP2981 - https://eips.ethereum.org/EIPS/eip-2981}

  function setRoyalties(
    uint256 _tokenId,
    address payable _royaltiesReceipientAddress,
    uint96 _percentageBasisPoints
  ) public onlyOwner {
    LibPart.Part[] memory _royalties = new LibPart.Part[](1);
    _royalties[0].value = _percentageBasisPoints;
    _royalties[0].account = _royaltiesReceipientAddress;
    _saveRoyalties(_tokenId, _royalties);
  }

  function supportsInterface(bytes4 interfaceId)
    public
    view
    virtual
    override(ERC721)
    returns (bool)
  {
    if (interfaceId == LibRoyaltiesV2._INTERFACE_ID_ROYALTIES) {
      return true;
    }
    return super.supportsInterface(interfaceId);
  }
}
