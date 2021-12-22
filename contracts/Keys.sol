// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Address.sol";

/// @title Keys Contract, for managing the behaviour of ERC721 keys
/// @notice Contract is used for tracking the keys claimed. These are non transferable erc721 contracts.
contract Keys is ERC721Enumerable, AccessControl, Ownable {
  using Address for address;
  using Strings for uint256;

  bytes32 public constant SALE_CONTRACT_ROLE = keccak256("SALE");

  string internal baseURI;

  /**
   * @notice The current mint count
   */
  uint256 private mintCount = 0;

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
    ERC721("Keys", "Key")
    notAddressZero(_saleContract)
  {
    _setupRole(SALE_CONTRACT_ROLE, _saleContract);
    _setRoleAdmin(SALE_CONTRACT_ROLE, DEFAULT_ADMIN_ROLE);
  }

  /**
   * @dev See {IERC165-supportsInterface}.
   */
  function supportsInterface(bytes4 _interfaceId)
    public
    view
    override(ERC721Enumerable, AccessControl)
    returns (bool)
  {
    return
      _interfaceId == type(IERC721).interfaceId ||
      _interfaceId == type(IERC721Metadata).interfaceId ||
      super.supportsInterface(_interfaceId);
  }

  /**
   * @notice Function to mint keys to the user, limited to max of 6969 keys
   * @dev The contract can be called form the sale contract only
   */
  function mintKeyToUser(address _user)
    public
    notAddressZero(_user)
    onlyRole(SALE_CONTRACT_ROLE)
  {
    require(mintCount < 6969, "All tokens minted");

    mintCount++;
    _safeMint(_user, mintCount);

    emit KeyMinted(_user);
  }

  /**
   * @notice Function to burn keys of the user
   * @dev The contract can be called form the sale contract only
   */
  function burnKeyOfUser(uint256 _tokenId, address _user)
    public
    notAddressZero(_user)
    onlyRole(SALE_CONTRACT_ROLE)
  {
    require(ownerOf(_tokenId) == _user, "Not the owner of the NFT");

    _burn(_tokenId);

    emit KeyBurned(_tokenId, _user);
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
}
