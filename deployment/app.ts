#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import config from "./config.json";
import {GlobalCertificateStack} from "./GlobalCertificateStack";
import {WebsiteHostingStack} from "./WebsiteHostingStack";

const app = new cdk.App();

const {sourceCodeFolderPathDev, stage, exclude, stackName, domainName} = config;

const certStack = new GlobalCertificateStack(app, `${stage}-${domainName.replace(".", "_")}-global-certificate-stack`, {
     env: {
          account: process.env.CDK_DEFAULT_ACCOUNT,
          region: "us-east-1"
     },
     crossRegionReferences: true,
     domainName,
     stackName: `${stage}-${domainName.replace(".", "_")}-global-certificate-stack`,
     exclude,
     stage,
     sourceCodeFolderPathDev
});

new WebsiteHostingStack(app, `${stage}-${stackName}`, certStack, {
     env: {
          account: process.env.CDK_DEFAULT_ACCOUNT,
          region: process.env.CDK_DEFAULT_REGION
     },
     crossRegionReferences: true,
     domainName,
     stackName: `${stage}-${stackName}`,
     exclude,
     stage,
     sourceCodeFolderPathDev
});
app.synth();
