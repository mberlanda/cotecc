# Development

The purpose of the file is to keep track of the step by step
istructions adopted.


Dependecies:

https://reactnative.dev/docs/environment-setup?os=macos&platform=android&guide=native#installing-dependencies

* `brew install curl-openssl`
* node >= 18. It can be installed using `nvm` https://github.com/nvm-sh/nvm
* ruby >= 2.7. It can be installed using `rbenv` https://github.com/rbenv/rbenv
* watchman for watching changes in filesystem and improve performances `brew install watchman`
* openjdk (recommended `zulu17` compatible with both arm and amd architecture). It can be installed via `sdkman` https://sdkman.io/install or via brew

* android studio
* xcode


### api
```
mkdir api && cd api
npm init -y
npm install express body-parser cors 
npm install  --save-dev typescript ts-node @types/express @types/body-parser @types/cors
npx tsc --init
```

### mobile
```
npx react-native init mobile --template react-native-template-typescript
cd mobile
```


### web
```
npx create-react-app web --template typescript
cd web
```

