// SPDX-License-Identifier:  GNU General Public License v3.0
pragma solidity ^0.8.10;

import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
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
  ERC721URIStorageUpgradeable,
  AccessControlUpgradeable,
  OwnableUpgradeable,
  RoyaltiesV2Impl,
  ReentrancyGuardUpgradeable,
  ERC2981ContractWideRoyalties
{
  using Counters for Counters.Counter;

  bytes32 public constant SALE_CONTRACT_ROLE = keccak256("SALE");

  /**
   * @dev The advisory tokenURI metadata CID
   */
  string public advisoryTokenURI;

  /**
   * @dev The public tokenURI metadata CID
   */
  string public publicTokenURI;

  /**
   * @notice The current mint count
   */
  Counters.Counter private _tokenIds;

  event UpdatedRoyalties(address newRoyaltyAddress, uint256 newPercentage);

  /**
   * @notice Emits when a scroll gets minted
   */
  event ScrollMinted(address user);

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
   * @dev Set the `advisoryTokenURI`
   */
  function setAdvisoryTokenURI(string calldata _advisoryTokenURI)
    external
    onlyOwner
  {
    advisoryTokenURI = _advisoryTokenURI;
  }

  /**
   * @dev Set the `publicTokenURI`
   */
  function setPublicTokenURI(string calldata _publicTokenURI)
    external
    onlyOwner
  {
    publicTokenURI = _publicTokenURI;
  }

  /**
   * @dev Get the current mint count.
   */
  function getTotalMintCount() external view returns (uint256) {
    return _tokenIds.current();
  }

  /**
   * @notice Function to mint the scroll to user. Called by the sale contract
   * after burning the key.
   */
  function mint(address _user, bool isAdvisoryMinter)
    external
    nonReentrant
    onlyRole(SALE_CONTRACT_ROLE)
  {
    require(address(0x0) != _user, "Must not be an empty address");

    _tokenIds.increment();
    uint256 currentTokenId = _tokenIds.current();

    _safeMint(_user, currentTokenId);
    _setTokenURI(
      currentTokenId,
      isAdvisoryMinter ? advisoryTokenURI : publicTokenURI
    );

    emit ScrollMinted(_user);
  }

  /**
   * @dev See {IERC165-supportsInterface}.
   */
  function supportsInterface(bytes4 _interfaceId)
    public
    view
    virtual
    override(
      ERC721EnumerableUpgradeable,
      ERC721Upgradeable,
      AccessControlUpgradeable,
      ERC2981Base
    )
    returns (bool)
  {
    return
      _interfaceId == LibRoyaltiesV2._INTERFACE_ID_ROYALTIES ||
      super.supportsInterface(_interfaceId);
  }

  /**
   * @param amount The amount of royalties to be set.
   */
  function setRoyalties(uint256 amount) external onlyOwner {
    _setRoyalties(msg.sender, amount);
  }

  /// @inheritdoc ERC721URIStorageUpgradeable
  function tokenURI(uint256 tokenId)
    public
    view
    virtual
    override(ERC721URIStorageUpgradeable, ERC721Upgradeable)
    returns (string memory)
  {
    return super.tokenURI(tokenId);
  }

  /**
   * @notice To set the `tokenURI` for a specific `tokenId`
   */
  function setTokenURIForTokenId(uint256 tokenId, string memory _tokenURI)
    external
    onlyOwner
  {
    _setTokenURI(tokenId, _tokenURI);
  }

  /**
   * @notice To set the `baseURI` value
   */
  function _baseURI() internal view virtual override returns (string memory) {
    return "ipfs://";
  }

  /// @inheritdoc ERC721URIStorageUpgradeable
  function _burn(uint256 tokenId)
    internal
    virtual
    override(ERC721URIStorageUpgradeable, ERC721Upgradeable)
  {
    super._burn(tokenId);
  }

  /// @inheritdoc ERC721EnumerableUpgradeable
  function _beforeTokenTransfer(
    address from,
    address to,
    uint256 tokenId
  ) internal virtual override(ERC721EnumerableUpgradeable, ERC721Upgradeable) {
    super._beforeTokenTransfer(from, to, tokenId);
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
