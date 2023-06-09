---
title: "File Upload, LFI, RFI, File Download 공격 정리"
excerpt: "File Upload, LFI, RFI, File Download 공격에 대하여 알아보자."
tags:
    - file upload
    - file download
    - lfi
    - rfi
last_modified_at: 2023-06-09T09:13:00-05:00
---
## File Upload 

### File Upload 공격 이란?
- 공격자가 임의의 파일을 업로드하는 공격이다.
- 서버 측에서 실행 가능한 파일 올리기 공격이다.

### 취약점 발생 이유
- 업로드 되는 파일을 검증하지 않아서 발생하는 취약점이다.

### 공격 시나리오
- **웹 쉘 업로드**. 파일 업로드 위치와 업로드한 파일을 실행할 수 있는지 알아야 한다.
- **디페이스 공격**. index.html 파일을 업로드하여 메인페이지를 바꾸는 공격이다.
- 페이지 변조 및 피싱 공격. 
- 악성코드 유포 ( 페이지에 XSS 넣기 )

### 대응 방법
1. 업로드 되는 파일을 DB 테이블에 저장하기. 즉 binary로 저장하기. ( CLOB or BLOB )
2. 파일 업로드 서버를 따로 두기. 즉 파일 업로드 서버에는 웹 서버 엔진( jsp, php 등 )이 설치되어 있으면 안된다.
3. 파일 검증하기. 확장자 검증, 파일 시그니쳐 검증, MIME TYPE 검증 ( Content-Type 검증 ).


## LFI ( Local File Inclusion )
- 웹 서버에서 사용하는  `include` 기능을 이용한 취약점이다.
- 서버가 사용자로 부터 파일이름(include 할 파일)을 입력으로 받을 때 발생한다.
- 파일 업로드 취약점의 자매품이다.
- 파일 업로드 보다 상위 공격에 속한다.

### Include 동작 과정
<img class="mermaid" src="https://mermaid.ink/svg/eyJjb2RlIjoic2VxdWVuY2VEaWFncmFtXG7sgqzsmqnsnpAgLT4-IOyEnOuyhCA6IO2OmOydtOyngCDsmpTssq1cbuyEnOuyhCAtPj4g7ISc67KEIDogaW5jbHVkZSDrkJwg66qo65OgIO2OmOydtOyngOulvCDrtojrn6zsmKTquLBcbuyEnOuyhCAtPj4g7ISc67KEIDog7Y6Y7J207KeAIOyLpO2WiSAoIOq3uOumrOq4sCApXG7shJzrsoQgLT4-IOyCrOyaqeyekCA6IOyZhOyEsSDtjpjsnbTsp4Ag7J2R64u1IiwibWVybWFpZCI6bnVsbH0">


### 공격 유형

#### 이미지 웹 쉘
- 이미지 파일에 웹 쉘을 추가하는 공격이다. 즉 확장자는 바뀔 필요가 없다.
- 이미지 파일 자체를 바로 실행하는 것은 불가능 하다.

##### 이미지 웹 쉘 실행 방법
1. .htaccess 서버 설정파일 바꾸기.
2. LFI 취약점 이용하기.

##### LFI 취약점 이용하기.

- 정상적인 페이지 요청.

```
?page=test.php
```

- 이미지 파일 맨 뒤에 웹 쉘 넣기.

```php
<?php echo system($_GET['cmd']); ?>
```

- 웹 쉘이 들어있는 이미지 경로를 적어준다.

```
?page=이미지 경로/이미지.png
```

- php 파일의 include에서 이미지 파일을 읽어온 다음 php 파일를 실행시켜 페이지를 완성시킨다.  이때 공격자의 웹쉘이 실행되는 공격법이다.

#### Access Log 파일 이용하기
- 이 취약점을 이용하면 파일 업로드를 할 필요도 없다.
- 공격자가 일부러 잘못된 요청을 보내어 오류를 로그에 기록하는 공격기법이다.
- 잘못된 요청<br>![Pasted image 20230609215043](https://github.com/MinGyu2/MinGyu2.github.io/assets/31990118/b803bb0b-532b-40f8-a64e-fe7b4622beda)

```
GET <?php echo system($_GET['cmd']); ?> HTTP/1.1
Host: 221.27.0.6
```

- access.log 파일<br>![Pasted image 20230609215006](https://github.com/MinGyu2/MinGyu2.github.io/assets/31990118/a90447c3-63d8-4c4f-addd-f69dc9fd2843)

- LFI 취약점이 존재하는 페이지를 찾아 요청에 access.log 파일 경로를 넣어주면 된다.

```
?page=로그파일 위치/access.log
```



## RFI ( Remote File Inclusion ) 
- 외부에서 파일을 가지고오는 공격이다.
- 내부의 파일을 불러오는 것이아닌 외부의 파일을 불러와 페이지를 완성시킨다.
- LFI 보다 공격하기 쉽다.

- 정상적 요청

```
?page=www.gg.rr/file.php
```

- 비정상적 요청

```
?page=공격자가 만든 웹쉥 php
```

## File Download 공격

### File Download 공격이란?
- 공격자가 원하는 임의의 파일을 다운로드 할 수 있는 공격이다.
- 소스코드 정보를 탈취할 수 있다. 따라서 소스코드에 적힌 DB 계정 정보를 탈취할 수 있다.

### File Download 유형

#### 링크를 통한 다운로드
- 인가 취약점이 존재할 수 있다. 즉 허락받지 않은 사용자가 파일을 다운받을 수 있다.
- 하지만 File Download 공격이 원천적으로 불가능 하다. 왜냐하면 url 경로를 통해 파일을 다운받기 때문이다.

#### 다운로드 스크립트가 존재하는 경우
- `download.php?file=test.jpg` 로 파일을 다운받을 경우이다. `download.php` 스크립트가 존재한다.
- File Download 취약점이 존재할 수 있다.

### File Download 취약점 찾기
1. 다운로드 스크립트가 존재하는지 확인한다. 스크립트가 없다면 다운로드 취약점은 존재하지 않는다.
2. 파라미터로 파일 이름을 받는지 아니면 파일 경로를 받는지 확인한다.

```
download.php?idx=2 => 취약점 없다 (db 에 저장하는 것 같다)

여기서 sqli 취약점이 존재하면 다운로드 취약점이 존재할 수 있다.
```


- sqli 취약점 이용하기. 서버에 저장된 파일 경로를 db 테이블에 저장하는 경우가 해당된다.

```sql
select path from board where idx={} 

?idx=0 union select '/etc/passwd'

sqli 취약점을 이용하여 원하는 파일을 다운로드 한다.
```


### 대응 방법
1. 파일을 DB 테이블에 저장하기.
2. 파일 저장 위치를 물리적으로 분리시키기. ( NAS )
3. 디렉토리 traversal 막기. (  `../` 경로 이동 막기 )
