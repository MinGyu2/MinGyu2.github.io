---
title: "[wargame.kr]php type confusion 문제"
excerpt: "type confusion 을 통해 if 문 인증을 우회할 수 있다."
categories:
    - dreamhack
tags:
    - wargame
    - php
    - type confusion
last_modified_at: 2023-08-27T09:13:00-05:00
---
## PHP 형 변환
- [문제](https://dreamhack.io/wargame/challenges/329)
- 서로 비교할 때 비교 각 대상의 타입이 일치하지 않아 발생하는 취약점이다.
- php 의 `==` 을 이용하여 비교를 진행할 때 발생한다.
- json 로 입력을 받을 때 발생할 수 있다.

### 문제 분석
- json 형태로 입력을 받아 디코드 한다.

```php
$json = json_decode($_POST['json']);
```

- json 형태로 넘겨줄 때 공격자는 타입을 정수형 또는 boolean 형 또는 string 형으로 넘겨줄 수 있다.

- 현재 여기서 `==` 을 이용하여 두 개의 값이 같은지만을 확인한다.

```php
if ($json->key == $key)
```

- 즉 자동으로 형 `$key` 값이 앞의 비교하는 형식으로 변환이 되는 취약점을 가지고 있다.


### 테스트

```php
<?php
$a = true;
if ($a == "dsf"){
        echo "true";
}else {
        echo "false";
}
?>
```

- true를 출력하는 것을 확인할 수 있다.<br>![Pasted image 20230827192833](https://user-images.githubusercontent.com/31990118/263522608-064bd56d-02fe-47a1-9dd9-e66fcf4b79b7.png)


```php
<?php
$a = true;
if ($a == ""){
        echo "true";
}else {
        echo "false";
}
?>
```

- false 를 출력하는 것을 확인할 수 있다.<br>![Pasted image 20230827193102](https://user-images.githubusercontent.com/31990118/263522737-f1863132-0b67-47f0-9daa-7be5ecec854e.png)


- 즉 `""` 아무것도 없을 때는 false 로 타입 변환이 일어나고 `"asdf"` 임의의 글자가 있을 때는 true 로 타입 변환이 되는 것을 확인할 수 있다.




### 공격 페이로드

```
json={"key":true}

if($json->key == "xyz") 비교 하면
"xyz" => true 로 형 변환이 일어난다.
```

### 대응 방안

- php 에서 두개의 값을 비교할 때 `==` 을 이용하여 값 만 비교하는 것이 아닌 `===` 을 사용하여 값과 타입을 모두 비교하도록 해주면 된다.

## 참고 사이트
- [php type confusion](https://m.blog.naver.com/wnsdnakdhkd6/221976728186)