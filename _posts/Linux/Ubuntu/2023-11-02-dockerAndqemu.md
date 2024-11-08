---
title: "Docker + QEMU"
excerpt: "host 아키텍처와 다른 docker 이미지를 동작시켜보자."
categories:
    - ubuntu
tags:
    - docker
last_modified_at: 2023-11-10T09:13:00-05:00
---

- 다른 아키텍처 이미지를 동작시키기 위해서는 qemu 가 필요하다.


## Docker 설치

- [기록하는 개발자 (mingyu2.github.io)](https://mingyu2.github.io/)


## 리눅스 [binfmt](https://github.com/tonistiigi/binfmt)

- 다른 아키텍처의 컨테이너를 만들기 위해서는 먼저 아래 명령어를 통해 추가 설치해주면 된다.

```
$ docker run --privileged --rm tonistiigi/binfmt --install all
```

- 설치 확인.

```
$ docker buildx ls
```


## 테스트 실행

- host 컴퓨터와 다른 아키텍처의 이미지 컨테이너를 생성 및 실행할 수 있다.

- host 컴퓨터

```
$ uname -a

Linux  5.15.90.1-microsoft-standard-WSL2 #1 SMP Fri Jan 27 02:56:13 UTC 2023 x86_64 x86_64 x86_64 GNU/Linux
```


- arm64 아키텍처 컨테이너

```
$ docker run --rm -it --platform linux/arm64 ubuntu:latest uname -a

Linux 135f72d2febe 5.15.90.1-microsoft-standard-WSL2 #1 SMP Fri Jan 27 02:56:13 UTC 2023 aarch64 aarch64 aarch64 GNU/Linux
```


- amd64 아키텍처 컨테이너

```
$ docker run --rm -it --platform linux/amd64 ubuntu:latest uname -a

Linux 4a0c73349a8f 5.15.90.1-microsoft-standard-WSL2 #1 SMP Fri Jan 27 02:56:13 UTC 2023 x86_64 x86_64 x86_64 GNU/Linux
```


## 참고사이트
- [Download QEMU - QEMU](https://www.qemu.org/download/#linux)
- [Docker container build driver - Docker Docs](https://docs.docker.com/build/drivers/docker-container/#qemu)
- [Docker Buildx로 cross-platform 이미지 빌드하기 (velog.io)](https://velog.io/@koo8624/Docker-Buildx%EB%A1%9C-cross-platform-%EC%9D%B4%EB%AF%B8%EC%A7%80-%EB%B9%8C%EB%93%9C%ED%95%98%EA%B8%B0)