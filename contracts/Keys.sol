// SPDX-License-Identifier: GNU General Public License v3.0
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "./@eip2981/ERC2981ContractWideRoyalties.sol";

/// @title Keys Contract, for managing the behaviour of ERC721 keys
/// @author Rachit Anand Srivastava, Carlo Miguel Dy
/// @notice Contract is used for tracking the keys claimed. These are non transferable erc721 contracts.
contract Keys is
  ERC721Enumerable,
  ERC721URIStorage,
  AccessControl,
  Ownable,
  ERC2981ContractWideRoyalties
{
  using Address for address;
  using Strings for uint256;
  using Counters for Counters.Counter;

  bytes32 public constant SALE_CONTRACT_ROLE = keccak256("SALE");

  /**
   * @notice 9700 + 299 = 9999 Total Supply
   */
  uint256 public constant TOTAL_SUPPLY = 9999;

  /**
   * @dev The tokenURI or IPFS CID for the magical key NFT.
   */
  string public magicalKeyTokenURI;

  /**
   * @notice The current mint count
   */
  Counters.Counter private _tokenIds;

  /**
   * @dev Keep track of keys burned
   */
  Counters.Counter private _burnedKeys;

  /**
   * @notice Emits when a Key gets minted to a user
   */
  event KeyMinted(address user);

  /**
   * @notice Emits when a Key gets burned by a user
   */
  event KeyBurned(uint256 tokenId, address user);

  /**
   * @notice Validates if the given address is not an empty address
   */
  modifier notAddressZero(address _address) {
    require(address(0x0) != _address, "Must not be an empty address");
    _;
  }

  /**
   * @notice Sets the MINT and BURN role for the sale contract
   */
  constructor(address _saleContract)
    ERC721("Atlantis World: Magical Keys", "AWMK")
    notAddressZero(_saleContract)
  {
    _setupRole(SALE_CONTRACT_ROLE, _saleContract);
    _setRoleAdmin(SALE_CONTRACT_ROLE, DEFAULT_ADMIN_ROLE);
    _setRoyalties(msg.sender, 750);
  }

  /**
   * @dev Get the current mint count
   */
  function getTotalMintCount() external view returns (uint256) {
    return _tokenIds.current();
  }

  /**
   * @dev Get the current keys burned count
   */
  function getTotalBurnedKeysCount() external view returns (uint256) {
    return _burnedKeys.current();
  }

  /**
   * @param amount The amount of royalties to be set.
   */
  function setRoyalties(uint256 amount) external onlyOwner {
    _setRoyalties(msg.sender, amount);
  }

  /**
   * @param _magicalKeyTokenURI The CID for the magical key NFT.
   * @dev Set the magical key token URI anytime.
   */
  function setMagicalKeyTokenURI(string calldata _magicalKeyTokenURI)
    external
    onlyOwner
  {
    magicalKeyTokenURI = _magicalKeyTokenURI;
  }

  /**
   * @notice Function to mint keys to the user, limited to max of 6969 keys
   * @dev The contract can be called form the sale contract only
   */
  function mintKeyToUser(address _user)
    external
    notAddressZero(_user)
    onlyRole(SALE_CONTRACT_ROLE)
  {
    require(_tokenIds.current() < TOTAL_SUPPLY, "All tokens minted");

    _tokenIds.increment();
    uint256 currentTokenId = _tokenIds.current();

    _safeMint(_user, currentTokenId);
    _setTokenURI(currentTokenId, magicalKeyTokenURI);

    emit KeyMinted(_user);
  }

  /**
   * @notice Function to burn keys of the user
   * @dev The contract can be called form the sale contract only
   */
  function burnKeyOfUser(uint256 _tokenId, address _user)
    external
    notAddressZero(_user)
    onlyRole(SALE_CONTRACT_ROLE)
  {
    require(ownerOf(_tokenId) == _user, "Not the owner of the NFT");

    _burnedKeys.increment();
    _burn(_tokenId);

    emit KeyBurned(_tokenId, _user);
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
   * @dev See {IERC165-supportsInterface}.
   */
  function supportsInterface(bytes4 _interfaceId)
    public
    view
    override(ERC721Enumerable, AccessControl, ERC2981Base, ERC721)
    returns (bool)
  {
    return
      _interfaceId == type(IERC721).interfaceId ||
      _interfaceId == type(IERC721Metadata).interfaceId ||
      super.supportsInterface(_interfaceId);
  }

  /// @inheritdoc ERC721URIStorage
  function _burn(uint256 tokenId)
    internal
    virtual
    override(ERC721URIStorage, ERC721)
  {
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

  /// @inheritdoc ERC721
  function _baseURI() internal view virtual override returns (string memory) {
    return "ipfs://";
  }
}
