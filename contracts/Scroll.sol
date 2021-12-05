// total - 6969
// mint -> burn the key to mint
// rarity -> 1% elder scrolls, special aesthtic, secret future perks, associate guilds => single struct

pragma solidity ^0.8.4;
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract ERC721Scroll is ERC721Enumerable, AccessControl {
  bytes32 public constant MINT = keccak256("MINT");
  bytes32 public constant OWNER = keccak256("OWNER");

  string baseURI = "";

  struct Scroll {
    uint256 age;
    uint256 aesthetic;
    uint256 guildId;
  }

  mapping(address => mapping(uint256 => Scroll)) private UserScroll;

  constructor(address owner, address mintContract) ERC721("Scroll", "SCR") {
    grantRole(MINT, mintContract);
    grantRole(OWNER, owner);
  }

  function mint(address user, uint256 tokenId) public onlyRole(MINT) {
    _safeMint(user, tokenId);
  }

  function _baseURI() internal view override returns (string memory) {
    return baseURI;
  }

  function setTokenURI(string calldata uri) public {
    baseURI = uri;
  }

  function getUserTokenDetails(address user, uint256 tokenId)
    public
    view
    returns (Scroll memory)
  {
    return UserScroll[user][tokenId];
  }

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
}
