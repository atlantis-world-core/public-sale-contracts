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
  RoyaltiesV2Impl
{
  bytes32 public constant SALE_CONTRACT_ROLE = keccak256("SALE");

  event UpdatedRoyalties(address newRoyaltyAddress, uint256 newPercentage);

  /// @notice Emits when a scroll gets minted
  event ScrollMinted(address user);

  string internal baseURI;

  /// @dev On initialize, it sets up the address of the deployed Sale contract
  /// @param _saleContract The address of the deployed Sale contract
  function initialize(address _saleContract) public initializer {
    _setupRole(SALE_CONTRACT_ROLE, _saleContract);
    _setRoleAdmin(SALE_CONTRACT_ROLE, DEFAULT_ADMIN_ROLE);
    __ERC721_init("Scroll", "SCR");
    __Ownable_init();
  }

  /// @notice Function to mint the scroll to user. Called by the sale contract after burning the key.
  function mint(address _user, uint256 _tokenId)
    public
    override
    onlyRole(SALE_CONTRACT_ROLE)
  {
    require(address(0x0) != _user, "Must not be an empty address");

    _safeMint(_user, _tokenId);

    emit ScrollMinted(_user);
  }

  /// @notice To set the BaseURI value
  function _baseURI() internal view override returns (string memory) {
    return baseURI;
  }

  /// @notice To set the BaseURI value
  function setTokenURI(string calldata _uri) public onlyOwner {
    baseURI = _uri;
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

  /// @dev See {IERC165-supportsInterface}.
  function supportsInterface(bytes4 _interfaceId)
    public
    view
    virtual
    override(ERC721EnumerableUpgradeable, AccessControlUpgradeable)
    returns (bool)
  {
    if (_interfaceId == LibRoyaltiesV2._INTERFACE_ID_ROYALTIES) {
      return true;
    }

    return super.supportsInterface(_interfaceId);
  }
}
