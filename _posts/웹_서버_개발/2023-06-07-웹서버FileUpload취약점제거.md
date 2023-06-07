---
title: "웹 서버의 File Upload 취약점 traversal"
excerpt: "웹 서버의 File Upload 취약점을 제거해 보자."
tags:
    - file upload
    - file upload traversal
last_modified_at: 2023-06-07T09:13:00-05:00
---


## File Upload 취약점
- **Traversal** 우회방법을 이용하여 업로드 파일 저장 위치를 바꿀 수 있다.
- 정삭적으로 파일을 업로드 하였을 때.<br>![Pasted image 20230606153031](https://github.com/MinGyu2/MinGyu2.github.io/assets/31990118/1f2c69a3-6014-4a81-9dc1-3869d52311cd)<br>![Pasted image 20230606153110](https://github.com/MinGyu2/MinGyu2.github.io/assets/31990118/22372933-db5f-44f2-9469-94701b9b36b4)<br>![Pasted image 20230606160012](https://github.com/MinGyu2/MinGyu2.github.io/assets/31990118/fe15095e-2d7c-4dde-99dc-d167e6014f5a)

- 현재 디렉토리를 의미하는 `./` 를 파일 이름에 붙이고 업로드 하였을 때.<br>![Pasted image 20230606155610](https://github.com/MinGyu2/MinGyu2.github.io/assets/31990118/3b16aa74-d42a-40c9-a537-1bc03ca57e82)<br>![Pasted image 20230606155621](https://github.com/MinGyu2/MinGyu2.github.io/assets/31990118/84774942-e5ac-4a4c-8074-a3b8836ee220)<br>![Pasted image 20230606160009](https://github.com/MinGyu2/MinGyu2.github.io/assets/31990118/d8ea09bc-f7c9-4bca-9df8-4ad43d6eeb4b)

- 이렇게 공격자는 마음대로 업로드 파일 저장 위치를 바꾸어 저장할 수 있다.


## 특정 문자 금지하기
- 업로드 파일 명에 특수문자를 사용하여 디렉토리를 옮기는 것을 막기위해 특정 특수문자를 필터링한다.
- 즉 `\ , / , : , * , ? , < , > , | , % , " ` 문자를 필터링 한다.
- 다음과 같은 문자가오는 파일이름이면 서버에 저장하지 않는다.

```java
var regex = "[/\\\\:*?<>|\"%]+";
var pattern = Pattern.compile(regex);
pattern.matcher(fileName).find()
```



## 구현
- 특정 문자가 파일이름에 들어가 있으면 업로드 파일을 서버에 저장하지 않는다.

### MainPage.java

- 특수 문자 검사 함수

```java
    // true : dont save file in server
    // false : save file in server
    private boolean notCorrectFileName(String fileNmae){
        var regex = "[/\\\\:*?<>|\"%]+";
        var pattern = Pattern.compile(regex);
        return pattern.matcher(fileNmae).find();
    }
```

- 검사하고 싶은 파일 이름을 넣어준다. 검사를 통과해야 업로드한 파일을 서버에 저장한다.

```java
// 파일 이름에 금지된 문자가 사용되면 파일 업로드 안하기.
if(notCorrectFileName(파일 이름)){
	continue;
}
```

## 결과
- burp suite 의 intercept 기능을 이용하여 파일 이름을 변경하여 서버로 요청을 보내게한다.<br>![Pasted image 20230607170427](https://github.com/MinGyu2/MinGyu2.github.io/assets/31990118/2894a644-59d8-4a67-950c-5911a9cddef1)
- 게시글은 작성되지만 파일은 서버에 저장이 안되는 것을 확인할 수 있다.<br>![Pasted image 20230607170507](https://github.com/MinGyu2/MinGyu2.github.io/assets/31990118/80c70def-c5e7-4b8c-8c5f-2a0d21035687)<br>![Pasted image 20230607172749](https://github.com/MinGyu2/MinGyu2.github.io/assets/31990118/69491d41-f74f-4cb2-a4a6-78c8497a0947)

