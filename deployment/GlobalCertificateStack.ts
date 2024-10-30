import * as route53 from "aws-cdk-lib/aws-route53";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import {Certificate, CertificateValidation} from "aws-cdk-lib/aws-certificatemanager";
import {Stack, StackProps, App, Duration} from "aws-cdk-lib";

export interface MyStaticSiteProps extends StackProps {
     sourceCodeFolderPathDev: string;
     domainName: string;
     stackName: string;
     exclude: Array<string>;
     stage: string;
}

const DEV = "dev";
const EXP = "exp";

const SEPARATE_HOSTED_ZONE = false;

const APP_NAME = "testapp";

const DEFAULT_WEBSITE_DEPLOYMENT_DOMAIN = `${APP_NAME}.cogniyon.ai`;
const isHostedZoneAvailable = false;

export class GlobalCertificateStack extends Stack {
     public readonly certificate: Certificate;
     constructor(scope: App, name: string, props: MyStaticSiteProps) {
          super(scope, name, props);

          let {domainName, stage} = props;
          domainName = `${stage}-${domainName}`;

          if (stage === DEV || stage === EXP) {
               domainName = DEFAULT_WEBSITE_DEPLOYMENT_DOMAIN;
          }
          let hostedZoneName = domainName;
          let aRecordName: string | undefined;

          if (!SEPARATE_HOSTED_ZONE) {
               hostedZoneName = extractApexDomain(domainName);
               aRecordName = extractSubdomain(domainName);
          }

          let hostedZone: route53.HostedZone | route53.IHostedZone;
          if (stage === DEV || stage === EXP) {
               hostedZone = route53.HostedZone.fromLookup(this, `${stage}-${hostedZoneName}-hostedZone`, {
                    domainName: hostedZoneName
               });
          } else {
               if (isHostedZoneAvailable) {
                    hostedZone = route53.HostedZone.fromLookup(this, `${stage}-${hostedZoneName}-hostedZone`, {
                         domainName: hostedZoneName
                    });
               } else {
                    hostedZone = new route53.HostedZone(this, `${stage}-${hostedZoneName}-hostedZone`, {
                         zoneName: `${hostedZoneName}`
                    });

                    let values: string[] = hostedZone.hostedZoneNameServers!;
                    let NsRecord = `${stage}-NsRecord`;
                    new route53.NsRecord(this, NsRecord, {
                         zone: hostedZone,
                         deleteExisting: false,
                         recordName: aRecordName,
                         values,
                         ttl: Duration.minutes(30)
                    });
               }
          }

          let logicalCerticateName = `${domainName}-certificate`;
          this.certificate = new acm.Certificate(this, logicalCerticateName, {
               domainName: domainName,
               certificateName: logicalCerticateName,
               subjectAlternativeNames: [`*.${domainName}`, `www.${domainName}`],
               validation: CertificateValidation.fromDns(hostedZone)
          });
     }
}

function extractApexDomain(url: string): string {
     let domain = url.replace(/(^\w+:|^)\/\/(www\.)?/, "");

     domain = domain.split("/")[0];

     const parts = domain.split(".");

     if (parts.length > 2) {
          return parts.slice(-2).join(".");
     }

     return domain;
}

function extractSubdomain(url: string): string | undefined {
     console.log("url: ", url);
     let domain = url.replace(/(^\w+:|^)\/\/(www\.)?/, "");
     domain = domain.split("/")[0];

     const parts = domain.split(".");

     if (parts.length > 2) {
          console.log(`Subdomain: ${parts.slice(0, -2).join(".")}`);
          return parts.slice(0, -2).join(".");
     }
     return undefined;
}
