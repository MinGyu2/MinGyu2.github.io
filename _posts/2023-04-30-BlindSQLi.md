---
title: "Blind SQL Injection 과정"
excerpt: "Blind SQL Injection 과정 정리."
categories:
    - 모의해킹수업
tags:
    - sql injection
    - Mysql
last_modified_at: 2023-04-30T09:13:00-05:00
---
## 이전 포스팅
[Union SQLi 과 Error Based SQLi 과정 정리.](https://mingyu2.github.io/SQLi%EB%B0%A9%EB%B2%95/)


## MYSQL 사전 지식

### DB 명 출력하기
```sql
select database() from dual;
```

### 테이블명 출력하기
```sql
select table_name from information_schema.tables where table_schema='DB명'
```

### 컬럼명 출력하기
```sql
select column_name from information_schema.columns where table_name='테이블명'
```


## Blind SQLi
- 참과 거짓 조건에 따른 응답을 이용하여 한글자씩 알아내어 데이터를 추출하는 공격이다.

### 조건
- 결과가 화면에 안나오는 곳에서 사용한다.
- 참과 거짓 조건에 따라 응답이 다른 곳에서 이용가능하다.

### 필요 함수
- substring
- ascii

### 과정
1. 서버에서 어떤 질의문을 사용하는지 예측하기.
```sql
select x from x where id='x';
```
2. Blind SQLi 을 사용하기 위하여 참/거짓 일때 응답 결과가 다른지 확인하기.<br><script src="https://gist.github.com/MinGyu2/f65663add3c2cf18dc2b4d996a442919.js"></script>

3. `select` 문 사용 가능한지 확인하기.<br><script src="https://gist.github.com/MinGyu2/4fe0c4b88eaf431299f49c54cb89d8f1.js"></script>
4. 공격 포맷 만들기.<br><script src="https://gist.github.com/MinGyu2/b7db2b39edc6e326b2426cc6a34fdeb5.js"></script>
5. database 이름 추출하기. 한 문자씩 알아내어야 한다.<br><script src="https://gist.github.com/MinGyu2/cd056483c528aad3bb968bf459155150.js"></script>
6. 테이블 이름들 추출하기. <br><script src="https://gist.github.com/MinGyu2/65ae660dd4ef296c1a50279c04dc8467.js"></script>
7. 컬럼 명 추출 하기.<br><script src="https://gist.github.com/MinGyu2/17bae3c8991982ee9e076df17b090fa7.js"></script>
8. 정보 추출하기.<br><script src="https://gist.github.com/MinGyu2/5b9e37325e12999931619d2a70f71dac.js"></script>