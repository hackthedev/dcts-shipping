# Architecture

#### Introduction

Many technical decisions around DCTS come from the concept that i will explain in this document. A lot is based on personal experience and things may be different for you, but fundamentally its what i believe is "correct". More on that topic later tho.

------

## The general goal

The goal for DCTS is to be as independent as possible and with minimum external factors with the intent of being future proof and impossible to regulate, which is why the server was designed to be self hosted and self hosted only, as any central service is a big potential target and must comply with law and could be easily blocked, like discord for example.

DCTS was designed to stay and last for the people that need something like this. You could compare a DCTS server to a TeamSpeak Server, as you could view both as individual islands where people can connect to and socialize. The difference now with DCTS there is decentralization. 

------

## Decentralization

I've spent a lot of time thinking and coming up with an idea on how to best create a network of servers that can securely communicate with each other while also having anti-spam and anti abuse mechanism built-in, which resulted in my own libraries like [dSync](https://www.npmjs.com/package/@hackthedev/dsync) that i plan to use for the communication as well as some other libraries i've made for additional features.

Without going too much into the technicality, the general concept is to enable servers to talk with each other freely, which could be used for synchronizing data, like DMs or exchange info about other servers in the network, which allows for a decentralized list of other instances. This has been actually implemented already and it doesnt just work, **its seamless**. Its important to keep the implementation and UX as simple as possible.

------

## Existing Solutions

Its important to make as many libraries and similar ourselves, as this comes with a lot of benefits and is better in the long run for DCTS. This way debugging becomes a lot easier which has been proven many times already, code optimization is easier too since you'll know what your code does and how it works and much more, tho its also important to check if its practical to create something yourself rather than using something existing, as you may lose yourself in something so big that it would be its own dedicated project. Sometimes this could be worth the effort, sometimes not, so its important to weigh your goal given your situation.

Also its important to keep the concept of "technical debt" in mind when choosing an existing solution.

------

## Quality degradation

Quality degradation aka "enshittification" has been witnessed many times in the past and is, in my opinion, a natural effect of all central services or companies in general that are not independent. Generally it means that a product is getting worse over time, and a simple example would be Discord locking more features behind their Nitro subscription, decreasing the file upload limit for "free" users and alike. This is not exclusive to discord but many other companies which will hurt or even kill companies in the long run.

DCTS is mostly driven by intuition and community feedback with the user first in mind, followed by admins.

#### How will DCTS avoid this?

Simply with independence. DCTS will never accept investors or garbage sponsors as seen on YouTube and other platforms. Anyone who likes the concept and idea behind DCTS can make donations via paypal or ko-fi, and if someone wants to help without money they can spread the word about DCTS. 

#### How to maintain DCTS?

There are plans for DCTS, like offering managed hosting or VPS systems for less technical people that want their own instance to then use that money to fund development in the future. There are some other plans as well but these are still in planning.

------

## Prioritization

Its important to prioritize features and improvements in the code base. For example, implementing dSync communications between servers now would not be ideal, even tho its an important feature, because there arent any known instances yet **and** the server and web client still arent fully complete, so instead of adding features that we currently dont need, its better to focus on the core server and client features and code base, as its more important to have a nicely working client and server rather than a "buggy decentralized messaging app".



**Most prioritizing is done based on the following:**

- Are there community feature requests?
  - Would it makes sense to implement now?
  - Would it be easy to implement?
- Can the feature be implement cleanly?
  - Would refactoring the affected part of the code base first make more sense?
- Is the feature important?
  - For example bugged bans, ip bans not working, security related features
- Is the feature/bug small enough to right away?
  - Small bugs **should** be fixed quickly and immediately if it breaks the feature or results in a visual glitch as long as refactoring of the underlying system first is not beneficial.
- When to refactor code?
  - Does a feature depend on it?
  - Nothing better to do or overly motivated?
