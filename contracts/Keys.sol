pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Address.sol";

/// @title Keys Contract, for managing the behaviour of ERC721 keys
/// @author Rachit Anand Srivastava
/// @notice Contract is used for tracking the keys claimed. These are non transferable erc721 contracts.

contract Keys is ERC721Enumerable, AccessControl, Ownable {
  using Address for address;
  using Strings for uint256;

  bytes32 public constant SALECONTRACT = keccak256("SALE");

  string internal baseURI = "";

  uint256 private count = 0;

  /**
   * @notice Sets the MINT and BURN role for the sale contract
   */
  constructor(address _saleContract) ERC721("Keys", "Key") {
    grantRole(SALECONTRACT, _saleContract);
  }

  /**
   * @dev See {IERC165-supportsInterface}.
   */
  function supportsInterface(bytes4 interfaceId)
    public
    view
    override(ERC721Enumerable, AccessControl)
    returns (bool)
  {
    return
      interfaceId == type(IERC721).interfaceId ||
      interfaceId == type(IERC721Metadata).interfaceId ||
      super.supportsInterface(interfaceId);
  }

  // Disabling Transfer of tokens
  /// @notice override transferFrom behaviour to prevent transfers.

  function transferFrom(
    address from,
    address to,
    uint256 tokenId
  ) public override {}

  function safeTransferFrom(
    address from,
    address to,
    uint256 tokenId
  ) public override {}

  function _safeTransfer(
    address from,
    address to,
    uint256 tokenId,
    bytes memory _data
  ) internal override {}

  /**
   * @notice Function to mint keys to the user, limited to max of 6969 keys
   * @dev The contract can be called form the sale contract only
   */

  function mintKeyToUser(address user) public onlyRole(SALECONTRACT) {
    require(count <= 6969, "All 6969 tokens have been minted");
    count++;
    _safeMint(user, count);
  }

  /**
   * @notice Function to burn keys of the user
   * @dev The contract can be called form the sale contract only
   */

  function burnKeyOfUser(uint256 tokenId, address user)
    public
    onlyRole(SALECONTRACT)
  {
    require(ownerOf(tokenId) == user, "Not the owner of the NFT");
    _burn(tokenId);
  }

  /// @notice override function for the baseURI
  function _baseURI() internal view override returns (string memory) {
    return baseURI;
  }

  /// @notice to set the BaseURI value
  function setTokenURI(string calldata uri) public onlyOwner {
    baseURI = uri;
  }
}
