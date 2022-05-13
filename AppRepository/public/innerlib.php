<?php 
chdir(dirname(__DIR__));
use Zend\Config\Factory;
use Firebase\JWT\JWT;

function CreateToken($UserName){
    $config = Factory::fromFile('config/config.php', true);
    $tokenId    = base64_encode(mcrypt_create_iv(32));
    $issuedAt   = time();
    $notBefore  = $issuedAt;  //From Begining
    $expire     = $issuedAt + 86400; // Adding 1 Day
    $serverName = $config->get('serverName');
    
    /*
     * Create the token as an array
    */
    $data = array('iat'  => $issuedAt,'jti'  => $tokenId, 'iss'  => $serverName,   
        'nbf'  => $notBefore,        // Not before
        'exp'  => $expire,           // Expire
        'data' => array(
        'userName' => $UserName // User name
        )
    );
    $secretKey = base64_decode($config->get('jwt')->get('key'));
    $algorithm = $config->get('jwt')->get('algorithm');
    $jwt = JWT::encode(
        $data,      //Data to be encoded in the JWT
        $secretKey, // The signing key
        $algorithm  // Algorithm used to sign the token, see https://tools.ietf.org/html/draft-ietf-jose-json-web-algorithms-40#section-3
    );

    $jwtArray = array('jwt' => $jwt);
    return $jwtArray;
}

function DBConnect(){
    $config = Factory::fromFile('config/config.php', true);
    $dsn = 'mysql:host=' . $config->get('database')->get('host') . ';dbname=' . $config->get('database')->get('name');
    $db = new PDO($dsn, $config->get('database')->get('user'), $config->get('database')->get('password'));
    $db->exec("SET CHARACTER SET utf8");
    return $db;
}

function ValidateToken($jwt){

    try{
        $config = Factory::fromFile('config/config.php', true);

        /*
         * decode the jwt using the key from config
        */
        $secretKey = base64_decode($config->get('jwt')->get('key'));
        $algorithm = $config->get('jwt')->get('algorithm');
        $token = JWT::decode($jwt, $secretKey, array($algorithm));
        $Data= json_decode(json_encode($token),true);
        return $Data['data']['userName'];
    }catch(Exception $e){
        return null;
    }

}

function OutResult($MethodName, $UserName, $Parameters){
    $ThisJWT = CreateToken($UserName);
    $ParameterSequence = '';

    if($Parameters!= ''){
        foreach ($Parameters as $key => $value){
        	if(substr($key,0,8)== "Password" && $value <> ""){
        		$options = array('cost' => 12,);
        		$value =  password_hash($value, PASSWORD_BCRYPT, $options);
        	}
            $key = str_replace("|", "/|", $key);
            $key = str_replace("=", "/=", $key);
            $value = str_replace("|", "/|", $value);
            $value = str_replace("=", "/=", $value);
            $ParameterSequence .= $key . '_='. $value. '_|';
        }
    }
    $db = DBConnect();
    $sql = "call CallMethod(:MethodName,:UserName,:Parameters);";
    $stmt = $db->prepare($sql);
    $stmt->bindParam(":MethodName", $MethodName,PDO::PARAM_STR,255);
    $stmt->bindParam(":UserName", $UserName,PDO::PARAM_STR,255);
    $stmt->bindParam(":Parameters", $ParameterSequence,PDO::PARAM_STR);
    $stmt->execute();
    header('Content-type: application/json');
    $AccResult = $ThisJWT;
    do{
        $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
        if(!empty($result)){
            if(isset($result[0]["info"])){
                if($result[0]["info"] == "Message"){
                    $stmt->nextRowset();
                    $tempResult = $stmt->fetchAll(PDO::FETCH_ASSOC);
                    $result = [$result[0]["info"]=>$tempResult[0]];
                }else{
                    $stmt->nextRowset();
                    $tempResult = $stmt->fetchAll(PDO::FETCH_ASSOC);
                    $result = [$result[0]["info"]=>$tempResult];
                }
            }
            $AccResult = array_merge($AccResult,$result);
        }
    }while ($stmt->nextRowset() == true);
    header('Content-type: application/json');
    echo json_encode($AccResult);
}
