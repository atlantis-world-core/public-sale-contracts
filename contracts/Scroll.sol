// SPDX-License-Identifier:  GNU General Public License v3.0
pragma solidity ^0.8.10;

import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "./@eip2981/ERC2981ContractWideRoyalties.sol";
import "./interface/IScroll.sol";
import "./lib/impl/RoyaltiesV2Impl.sol";
import "./lib/LibPart.sol";
import "./lib/LibRoyaltiesV2.sol";

/// @title Scroll Contract, for managing the behaviour of ERC721 Scroll.
/// @notice Contract is used for tracking the Scrolls claimed.
/// @author Rachit Anand Srivastava, Carlo Miguel Dy
/// @dev the contract is made upgradaeble using OpenZeppelin Upgadaeble Library
contract ScrollContract is
  IScroll,
  ERC721EnumerableUpgradeable,
  AccessControlUpgradeable,
  OwnableUpgradeable,
  RoyaltiesV2Impl,
  ReentrancyGuardUpgradeable,
  ERC2981ContractWideRoyalties
{
  bytes32 public constant SALE_CONTRACT_ROLE = keccak256("SALE");

  event UpdatedRoyalties(address newRoyaltyAddress, uint256 newPercentage);

  /**
   * @notice Emits when a scroll gets minted
   */
  event ScrollMinted(address user);

  string internal baseURI;

  /**
   * @dev On initialize, it sets up the address of the deployed Sale contract
   * @param _saleContract The address of the deployed Sale contract
   */
  function initialize(address _saleContract) public initializer {
    _setupRole(SALE_CONTRACT_ROLE, _saleContract);
    _setRoleAdmin(SALE_CONTRACT_ROLE, DEFAULT_ADMIN_ROLE);
    __ERC721_init("Atlantis World: Founding Atlantean Scrolls", "AWFAS");
    __Ownable_init();
    _setRoyalties(msg.sender, 10000);
  }

  /**
   * @param amount The amount of royalties to be set.
   */
  function setRoyalties(uint256 amount) external onlyOwner {
    _setRoyalties(msg.sender, amount);
  }

  /**
   * @notice Function to mint the scroll to user. Called by the sale contract
   * after burning the key.
   */
  function mint(address _user, uint256 _tokenId)
    public
    override
    nonReentrant
    onlyRole(SALE_CONTRACT_ROLE)
  {
    require(address(0x0) != _user, "Must not be an empty address");

    _safeMint(_user, _tokenId);

    emit ScrollMinted(_user);
  }

  /**
   * @notice To set the `baseURI` value
   */
  function _baseURI() internal view override returns (string memory) {
    return baseURI;
  }

  /**
   * @notice To set the `baseURI` value
   */
  function setTokenURI(string calldata _uri) public onlyOwner {
    baseURI = _uri;
  }

  /**
   * @dev {EIP2981 - https://eips.ethereum.org/EIPS/eip-2981}
   */
  function setRaribleRoyalties(
    uint256 _tokenId,
    address payable _royaltiesReceipientAddress,
    uint96 _percentageBasisPoints
  ) public onlyOwner {
    LibPart.Part[] memory _royalties = new LibPart.Part[](1);

    _royalties[0].value = _percentageBasisPoints;
    _royalties[0].account = _royaltiesReceipientAddress;

    _saveRoyalties(_tokenId, _royalties);
  }

  /**
   * @dev See {IERC165-supportsInterface}.
   */
  function supportsInterface(bytes4 _interfaceId)
    public
    view
    virtual
    override(ERC721EnumerableUpgradeable, AccessControlUpgradeable, ERC2981Base)
    returns (bool)
  {
    return
      _interfaceId == LibRoyaltiesV2._INTERFACE_ID_ROYALTIES ||
      super.supportsInterface(_interfaceId);
  }

  /**
   * @notice Just a fund safe function
   */
  function withdraw(address _targetAddress) external onlyOwner {
    require(
      _targetAddress != address(0),
      "The target address must not be empty."
    );

    address payable targetAddress = payable(_targetAddress);
    targetAddress.transfer(address(this).balance);
  }
}
