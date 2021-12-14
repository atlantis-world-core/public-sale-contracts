// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "hardhat/console.sol";

/// @title Keys Contract, for managing the behaviour of ERC721 keys
/// @author Rachit Anand Srivastava
/// @notice Contract is used for tracking the keys claimed. These are non transferable erc721 contracts.
contract KeysContract is ERC721Enumerable, AccessControl, Ownable {
    using Address for address;
    using Strings for uint256;

    bytes32 public constant SALE_CONTRACT_ROLE = keccak256("SALE");

    string internal baseURI = "";

    /// @dev The current total count of all the minted keys
    uint256 private count = 0;

    /// @notice Sets the MINT and BURN role for the sale contract
    constructor(address _saleContract) ERC721("Keys", "Key") {
        // grantRole(SALE_CONTRACT_ROLE, _saleContract);
        _setupRole(DEFAULT_ADMIN_ROLE, _saleContract);
        _setRoleAdmin(SALE_CONTRACT_ROLE, DEFAULT_ADMIN_ROLE);
        
        console.log("Keys contract deployed by '%s'", msg.sender);
        console.log("_saleContract", _saleContract);
    }

    /// @dev See {IERC165-supportsInterface}.
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

    /// @notice override transferFrom behaviour to prevent transfers
    /// @dev Disabling transfer of tokens
    function transferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public pure override {
        require(false, "Token transfers are disabled.");
        from;
        to;
        tokenId;
    }

    /// @notice override safeTransferFrom behaviour to prevent transfers
    /// @dev Disabling transfer of tokens
    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public pure override {
        require(false, "Token transfers are disabled.");
        from;
        to;
        tokenId;
    }

    /// @notice override _safeTransfer behaviour to prevent transfers
    /// @dev Disabling transfer of tokens
    function _safeTransfer(
        address from,
        address to,
        uint256 tokenId,
        bytes memory _data
    ) internal pure override {
        require(false, "Token transfers are disabled.");
        from;
        to;
        tokenId;
        _data;
    }

    /// @notice Function to mint keys to the user, limited to max of 6969 keys
    /// @dev The contract can be called form the sale contract only
    function mintKeyToUser(address _user) public onlyRole(SALE_CONTRACT_ROLE) {
        require(count <= 6969, "All 6969 tokens have been minted");
        count++;
        _safeMint(_user, count);
    }

    /// @notice Function to burn keys of the user
    /// @dev The contract can be called form the sale contract only
    function burnKeyOfUser(uint256 _tokenId, address _user)
        public
        onlyRole(SALE_CONTRACT_ROLE)
    {
        require(ownerOf(_tokenId) == _user, "Not the owner of the NFT");
        _burn(_tokenId);
    }

    /// @notice to set the BaseURI value
    function _baseURI() internal view override returns (string memory) {
        return baseURI;
    }

    /// @notice to set the BaseURI value
    function setTokenURI(string calldata _uri) public onlyOwner {
        baseURI = _uri;
    }
}
