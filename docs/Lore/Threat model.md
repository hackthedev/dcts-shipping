# Threat model

This document will talk about possible issues and precautionary measurements that have been made to try to best combat issues and to be transparent of possible weaknesses. 


---

## Trust assumptions

1. The server has full authority
2. Users trust instances they connect to.
3. Other (federated) instances are not trusted by default
4. Clients are not trusted by default


---

## Potential threats

This is a list of potential issues that may surface and scenarios that could potentially occur. The list may not be complete but should give a rough understanding.
### Compromised instance
1. Account takeovers
2. Malicious instance operator
3. Hacked server
4. Potential data leak
5. MITM server side public key exchange

### dSync Federation
1. Spam/Abuse events
2. Malicious events (fake bans)
3. Identity spoofing

### User Attacks
1. Spam
2. Token theft
3. Exported Account theft
4. Brute force logins
5. XSS or other possible vulnerabilities
6. Ban evading
7. Private key theft


---

## Mitigations

###  Compromised instance
1. None. Responsibility lies within the instance operator.

### dSync Federation
1. Implemented rate limits. Plans for abuse events and bundling them to avoid forcing a server to spam penalty events making a trustworthy node a potential spammer.
2. Penalty events and possibly blocking the emitter node. Reducing trust until it will be automatically blocked due to a threshold limit and being potentially blocked by all nodes if setup to do so.
3. All events are cryptographically signed. Every node can independently verify events. Manipulations will be detected too. Penalty events will be broadcasted until the trust score hits the threshold and will be potentially blocked in the entire network as well, if nodes are setup to do so individually.
### User Attacks
1. Various rate limits and a new rate limit system thats dynamic and will be based on community activity. Based on per channel and user and as accurate as to the current hour. IP based checking for VPNs, proxies, datacenter ips (bots/spam services) and more.
2. None yet. Its possible to rotate ALL user tokens, but not specific ones yet. There are plans to add IP based checks like country changes, carrier change or similar to block this from being possible, but not implemented yet. Contact an instance admin.
3. None. Same as 2.
4. Login try limit and automatic temporary ban. Possible enhancement: Let admins and the affected user know about failed attempts.
5. Many filters in the server as well as client side to prevent unsanitized input from the server to cauz problems in the client. In case something does happen, patch it asap, create a security release and be transparent about and let people know. Staying up to date from a code perspective. Enhancement: Add more automatic test cases that explicitly target these.
6. Advanced IP based filtering for VPNs, Tor connections, datacenter connections and more. While not impossible to bypass, it will make it harder and has been proven to work so far.
7. A "bridge" has been made using the preloader in electron to block direct access to any of the encryption related functions which in theory should be impossible to steal the private key *from the web client* as electron should isolate it. This has been roughly tested and was not possible so far, tho maybe someone with more expertise could test this theory more extensively. If stolen an attacker could read encrypted DMs or authenticate with it. **Further testing is needed!**


---


## Non-Goals

There are also some things DCTS wont do:
- protect against malicious instance operators
- guarantee global moderation fairness
- prevent illegal content and activities
- protect against OS level compromises
- protect against data leaks
- protect against "stolen accounts"

> [!NOTE]
> There are potential plans for the future to implement a warning screen for known malicious instances, but this is still a concept and not implemented as of right now.