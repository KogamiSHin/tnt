abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }

    function _msgData() internal view virtual returns (bytes calldata) {
        return msg.data;
    }
}
interface GEOS20 {
  function totalSupply() external view returns (uint256);
  function balanceOf(address account) external view returns (uint256);
  function transfer(address recipient, uint256 amount) external returns (bool);
  function allowance(address owner, address spender) external view returns (uint256);
  function approve(address spender, uint256 amount) external returns (bool);
  function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) external returns (bool);
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}
interface GEOS20Metadata is GEOS20 {
  function name() external view returns (string memory);
  function symbol() external view returns (string memory);
  function decimals() external view returns (uint8);
}
abstract contract Ownable is Context {
    address private _owner;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
     constructor() {
        _transferOwnership(_msgSender());
    }
    function owner() public view virtual returns (address) {
        return _owner;
    }
 modifier onlyOwner() {
        require(owner() == _msgSender(), "Ownable: caller is not the owner");
        _;
    }
    function renounceOwnership() public virtual onlyOwner {
        _transferOwnership(address(0));
    }function transferOwnership(address newOwner) public virtual onlyOwner {
        require(newOwner != address(0), "Ownable: new owner is the zero address");
        _transferOwnership(newOwner);
    }
     function _transferOwnership(address newOwner) internal virtual {
        address oldOwner = _owner;
        _owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
}
contract GEO20 is Context, GEOS20, GEOS20Metadata, Ownable {
    mapping(address => uint256) private _balances;

    mapping(address => mapping(address => uint256)) private _allowances;

    uint256 private _totalSupply;
    string private _name;
    string private _symbol;

    bool noMoreMints;

    mapping(address => bool) private _whitelisted;
    mapping(address => bool) private _earlybirdList;

    mapping(address => bool) private _liqPools;
    mapping(uint256 => uint256[]) _txnTypeFees;

    bool public tokenGoLive;
    bool public earlyBirds;
    
    uint256 maxEBamount = 20000 ether;    
     function checkFees(uint256[] memory _fees) internal pure{
        uint256 feMax = 30;
        for (uint256 i=0; i< _fees.length; i++){
            if(_fees[i] >= feMax){
                revert("Maximum on fees is 3%");
            }
        }
    }

    function initFees() internal{
        _txnTypeFees[0] = [0];
        _txnTypeFees[1] = [0];
        _txnTypeFees[2] = [0];
    }

    function isContract(address _addr) internal view returns (bool){
        uint32 size;
        assembly {
            size := extcodesize(_addr)
        }
        return (size > 0);
    }

    function setMaxEarlyBirdsAmount(uint256 amount) public onlyOwner {
        maxEBamount = amount;
    }
    
    function addLiquidityPool(address _pool) public onlyOwner {
        _liqPools[_pool] = true;
    }
    
    function removeLiquidityPool(address _pool) public onlyOwner {
        _liqPools[_pool] = false;
    }
    
    function removeWhitelist(address _wladdr) public onlyOwner {
        _whitelisted[_wladdr] = false;
    }
    
    function removeEarlyBird(address _earlyBird) public onlyOwner {
        _earlybirdList[_earlyBird] = false;
    }
    function changeFee(uint256 _txnType,  uint256[] memory _newFees) public onlyOwner{
        checkFees(_newFees); 
        _txnTypeFees[_txnType] = _newFees;
    }   
    function addToWhitelist(address _wlAddr) public onlyOwner {
        _whitelisted[_wlAddr] = true;
    }
    function addToEarlyBirds(address bird) public onlyOwner {
        require(!isContract(bird),"Cannot Add Smart Contracts to Early Birds");
        _earlybirdList[bird] = true;
    }
    function addBatchToEarlyBirds(address[] calldata birds) public onlyOwner {
        for (uint256 i=0 ; i<birds.length; i++){
            if(!isContract(birds[i])){
                _earlybirdList[birds[i]] = true;
            }
        }
    }
    constructor(string memory name_, string memory symbol_, uint256 _maxSupply) {
        _whitelisted[msg.sender] = true;
        _liqPools[address(this)] = true;
        _mint(msg.sender, _maxSupply);
        _name = name_;
        _symbol = symbol_;
        initFees();
        noMoreMints = true;
    }
     function name() public view virtual override returns (string memory) {
        return _name;
    }
    function symbol() public view virtual override returns (string memory) {
        return _symbol;
    }
    function decimals() public view virtual override returns (uint8) {
        return 18;
    }
    function totalSupply() public view virtual override returns (uint256) {
        return _totalSupply;
    }
     function balanceOf(address account) public view virtual override returns (uint256) {
        return _balances[account];
    }
    function transfer(address recipient, uint256 amount) public virtual override returns (bool) {
        _transfer(_msgSender(), recipient, amount);
        return true;
    }
     function allowance(address owner, address spender) public view virtual override returns (uint256) {
        return _allowances[owner][spender];
    }
     function approve(address spender, uint256 amount) public virtual override returns (bool) {
        _approve(_msgSender(), spender, amount);
        return true;
    }
     function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) public virtual override returns (bool) {
        _transfer(sender, recipient, amount);

        uint256 currentAllowance = _allowances[sender][_msgSender()];
        require(currentAllowance >= amount, "ERC20: transfer amount exceeds allowance");
        unchecked {
            _approve(sender, _msgSender(), currentAllowance - amount);
        }

        return true;
    }
