// SPDX-License-Identifier:  GNU General Public License v3.0
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "./@eip2981/ERC2981ContractWideRoyalties.sol";
import "./interface/IAtlantisWorldFoundingAtlanteanScrolls.sol";
import "./lib/impl/RoyaltiesV2Impl.sol";
import "./lib/LibPart.sol";
import "./lib/LibRoyaltiesV2.sol";

/**
 * ▄▀█ ▀█▀ █░░ ▄▀█ █▄░█ ▀█▀ █ █▀   █░█░█ █▀█ █▀█ █░░ █▀▄
 * █▀█ ░█░ █▄▄ █▀█ █░▀█ ░█░ █ ▄█   ▀▄▀▄▀ █▄█ █▀▄ █▄▄ █▄▀
 *
 *
 * Atlantis World is building the Web3 social metaverse by connecting Web3 with social,
 * gaming and education in one lightweight virtual world that's accessible to everybody.
 *
 * # CJ Hetherington
 *
 * “I’m forever a man indebted to the great and fantastically talented builders
 * beside me here that have made Atlantis World an (almost) reality. As I look
 * back on the moments that have shaped me as the years have gone by, I’ve never
 * been so transformed by the magic felt as I joined hands and minds with Rev, Julio,
 * Ilayda, Austyn, Rachit, Carlo, Chris and Eylul. I love you all folks, it’s great
 * to be learning and growing whilst cultivating this movement all together.
 * We’re just getting started, this is just the beginning, and it’s time to reach
 * terminal velocity. It’s going to be a wild ride, so strap in. Let’s do everything
 * in our power to always over deliver and never let down those who have supported us
 * and will continue to. Greatness depends on what we do next. Let’s DAO it, frens!”
 *
 * # Rev Miller
 *
 * “Living in a world of prosperity, freedom, and joy - the world that’s true to your
 * beliefs and values, the world that creates abundance for everyone involved and helps
 * those in need. the world where kindness, integrity, intelligence, and energy are met.
 * The world of constant exploration, experimentation, and growth. that’s the world most
 * of us want to live in, the world we want to grow and build for future generations. All
 * while being whoever we wanted to be, contributing to something bigger than ourselves,
 * and giving it everything we’ve got. that’s the world we’re building together - with the team,
 * the community, our whole family behind Atlantis World - the world we all deserve.”
 *
 * # Julio Alcantara
 *
 * “We all come from different walks of life and think we cannot do great things. But
 * adventure is just waiting out there for anyone. You just need to stay positive and
 * look for youir moment. When that time comes, you better be ready to give it your all.
 * Alone we are but droplets, but together we are an endless Ocean!”
 *
 * # Ilayda Pinarbasi
 *
 * “Success is getting what you want. Happiness is wanting what you get. I am sure that we
 * will get the happines. With this team, community and destination that we have, it is
 * predictable. I am always grateful for being part of Atlantis World. We have just started, wagmi!”
 *
 * # Rachit Srivastava
 *
 * “"Let us step into the night and pursue that flighty temptress, adventure". - J.K Rowling
 *  Metaverse is the future of technology, and I see Atlantis world to be the among the core project
 *  in the space. WAGMI!”
 *
 * # Austyn Studdard
 *
 * “We’re all our own piano man”
 *
 * # Chris Diperio
 *
 * “It has been such a pleasure to be a part of this amazing project and even more amazing team. WAGMI!”
 *
 * # Carlo Miguel Dy
 *
 * “We're building together for the decentralized future at Atlantis World, WAGMI frens!”
 *
 * # Eylul Civelek
 *
 * “Atlantis World is such a rare kind of project to work on. I couldn't have asked for a better team to
 * be part of. We were born to make history together!”
 *
 *
 * @title Atlantis World Founding Atlantean Scrolls contract, for managing the behaviour of ERC721 Scroll.
 * @notice Contract is used for tracking the Scrolls claimed.
 * @author Rachit Anand Srivastava, Carlo Miguel Dy
 * @dev the contract is made upgradaeble using OpenZeppelin Upgadaeble Library
 */
contract AtlantisWorldFoundingAtlanteanScrolls is
  IAtlantisWorldFoundingAtlanteanScrolls,
  ERC721Enumerable,
  ERC721URIStorage,
  AccessControl,
  Ownable,
  RoyaltiesV2Impl,
  ReentrancyGuard,
  ERC2981ContractWideRoyalties
{
  using Counters for Counters.Counter;

  bytes32 public constant SALE_CONTRACT_ROLE = keccak256("SALE");

  /**
   * @notice The current mint count
   */
  Counters.Counter private _tokenIds;

  /**
   * @dev All advisory token IDs
   */
  uint256[] private _advisoryTokenIds;

  /**
   * @dev All public token IDs
   */
  uint256[] private _publicTokenIds;

  /**
   * @dev Keeps track of all advisory token IDs that have the tokenURI updated.
   */
  mapping(uint256 => bool) private _advisoryTokenIdToURIUpdated;

  /**
   * @dev Keeps track of all public token IDs that have the tokenURI updated.
   */
  mapping(uint256 => bool) private _publicTokenIdToURIUpdated;

  /**
   * @dev Keeps track of each token ID if it was minted by an advisory.
   */
  mapping(uint256 => bool) private _tokenIdToAdvisoryMint;

  /**
   * @dev Keeps track of each token ID if it was minted by public.
   */
  mapping(uint256 => bool) private _tokenIdToPublicMint;

  string[4] private _advisoryCIDs;

  string[4] private _publicCIDs;

  event UpdatedRoyalties(address newRoyaltyAddress, uint256 newPercentage);

  /**
   * @notice Emits when a scroll gets minted
   */
  event ScrollMinted(address user);

  constructor(address _saleContract)
    ERC721("Atlantis World: Founding Atlantean Scrolls", "AWFAS")
  {
    _setupRole(SALE_CONTRACT_ROLE, _saleContract);
    _setRoleAdmin(SALE_CONTRACT_ROLE, DEFAULT_ADMIN_ROLE);
    _setRoyalties(msg.sender, 7500);
  }

  function setAdvisoryCIDs(string[4] memory _uris) external onlyOwner {
    _advisoryCIDs = _uris;
  }

  function setPublicCIDs(string[4] memory _uris) external onlyOwner {
    _publicCIDs = _uris;
  }

  /**
   * @dev Checks if the advisory tokenId has the tokenURI updated.
   */
  function advisoryTokenIdToURIUpdated(uint256 tokenId)
    external
    view
    returns (bool)
  {
    return _advisoryTokenIdToURIUpdated[tokenId];
  }

  /**
   * @dev Checks if the public tokenId has the tokenURI updated.
   */
  function publicTokenIdToURIUpdated(uint256 tokenId)
    external
    view
    returns (bool)
  {
    return _publicTokenIdToURIUpdated[tokenId];
  }

  /**
   * @dev Checks if the tokenId was minted by an advisory.
   */
  function tokenIdToAdvisoryMint(uint256 tokenId) public view returns (bool) {
    return _tokenIdToAdvisoryMint[tokenId];
  }

  /**
   * @dev Checks if the tokenId was minted from public.
   */
  function tokenIdToPublicMint(uint256 tokenId) public view returns (bool) {
    return _tokenIdToPublicMint[tokenId];
  }

  /**
   * @dev Get a list of all advisory token IDs
   */
  function getAdvisoryTokenIds() external view returns (uint256[] memory) {
    return _advisoryTokenIds;
  }

  /**
   * @dev Get a list of all public token IDs
   */
  function getPublicTokenIds() external view returns (uint256[] memory) {
    return _publicTokenIds;
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

    uint256 guildId = block.timestamp % 4;
    string memory guildTokenURI;

    _tokenIds.increment();
    uint256 currentTokenId = _tokenIds.current();

    if (isAdvisoryMinter) {
      _advisoryTokenIds.push(currentTokenId);
      _tokenIdToAdvisoryMint[currentTokenId] = true;
      guildTokenURI = _advisoryCIDs[guildId];
    } else {
      _publicTokenIds.push(currentTokenId);
      _tokenIdToPublicMint[currentTokenId] = true;
      guildTokenURI = _publicCIDs[guildId];
    }

    _safeMint(_user, currentTokenId);
    _setTokenURI(currentTokenId, guildTokenURI);

    emit ScrollMinted(_user);
  }

  /**
   * @dev See {IERC165-supportsInterface}.
   */
  function supportsInterface(bytes4 _interfaceId)
    public
    view
    virtual
    override(ERC721Enumerable, ERC721, AccessControl, ERC2981Base)
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

  /// @inheritdoc ERC721URIStorage
  function tokenURI(uint256 tokenId)
    public
    view
    virtual
    override(ERC721URIStorage, ERC721)
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
    if (tokenIdToAdvisoryMint(tokenId)) {
      _advisoryTokenIdToURIUpdated[tokenId] = true;
    } else if (tokenIdToPublicMint(tokenId)) {
      _publicTokenIdToURIUpdated[tokenId] = true;
    }

    _setTokenURI(tokenId, _tokenURI);
  }

  /**
   * @notice To set the `baseURI` value
   */
  function _baseURI() internal view virtual override returns (string memory) {
    return "ipfs://";
  }

  /// @inheritdoc ERC721URIStorage
  function _burn(uint256 tokenId)
    internal
    virtual
    override(ERC721URIStorage, ERC721)
  {
    require(false, "No burning allowed");

    super._burn(tokenId);
  }

  /// @inheritdoc ERC721Enumerable
  function _beforeTokenTransfer(
    address from,
    address to,
    uint256 tokenId
  ) internal virtual override(ERC721Enumerable, ERC721) {
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
