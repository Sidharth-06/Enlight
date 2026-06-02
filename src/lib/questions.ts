import { DifficultyLevel, InterviewType, Question } from "@/lib/types";

const topicsByType: Record<InterviewType, string[]> = {
  Technical_Coding: ["Arrays", "Hash Maps", "Binary Trees", "Dynamic Programming", "Graph Search"],
  Technical_System_Design: ["Notifications", "Search", "Rate Limiting", "File Storage", "Chat"],
  Behavioral: ["Leadership", "Conflict Resolution", "Failure and Learning", "Teamwork", "Initiative"],
  Situational: ["Prioritization", "Stakeholder Alignment", "Ambiguity", "Escalation", "Delivery Risk"],
  HR: ["Motivation", "Career Goals", "Company Fit", "Salary Expectations", "Availability"],
};

const prompts: Record<InterviewType, string> = {
  Technical_Coding:
    "Solve the problem clearly. Include the approach, edge cases, time complexity, and space complexity.",
  Technical_System_Design:
    "Design the system. Clarify requirements, outline architecture, data model, scaling choices, and trade-offs.",
  Behavioral:
    "Answer using STAR: Situation, Task, Action, and Result. Keep the story specific and outcome-oriented.",
  Situational:
    "Explain what you would do, why you would do it, who you would involve, and how you would measure success.",
  HR: "Answer professionally with role alignment, concrete detail, and a recruiter-friendly tone.",
};

const difficultyContext: Record<DifficultyLevel, string> = {
  Beginner: "Keep the scenario focused and practical.",
  Intermediate: "Include moderate ambiguity and require trade-off discussion.",
  Advanced: "Include cross-functional impact, high scaling considerations, or organizational constraints.",
};

const questionTemplates: Record<InterviewType, Record<string, { title: string; description: string; prompt: string }>> = {
  Technical_Coding: {
    "Arrays": {
      title: "Subarray Sum Target Optimization",
      description: "You are optimizing a low-latency sliding window parser for a high-frequency trading system. The system receives a continuous stream of integer trade valuations, and you must find a contiguous subarray that sums to a specific target valuation.",
      prompt: "Given an array of integers 'nums' and an integer 'target', find the indices of the contiguous subarray that sums to 'target'. If multiple exist, return the shortest one. Describe the algorithm, space/time complexity, and implement a highly optimized solution."
    },
    "Hash Maps": {
      title: "Unique Transaction Lookup in Database Stream",
      description: "Your e-commerce backend needs to process rapid duplicate charge requests. You are analyzing transaction IDs to quickly locate the first non-duplicated payment payload in the database stream.",
      prompt: "Given a string 's' representing a sequence of transaction IDs, find the first non-repeating character/ID and return its index. If it does not exist, return -1. State the complexity and code the solution."
    },
    "Binary Trees": {
      title: "Mirror Order Routing Failover Tree",
      description: "An international brokerage routing engine needs to invert its hierarchical server routing tree to support multi-region failover and dual active-active replication pipelines.",
      prompt: "Invert a binary tree structure. Given the root of a binary tree, mirror its children and return the inverted tree. Provide the complexity analysis and implementation."
    },
    "Dynamic Programming": {
      title: "Robotic Locomotive Pathing Optimization",
      description: "A robotics pathfinding system is calculating energy-efficient locomotive paths up a flight of physical step escalations. The robot can climb either 1 or 2 steps at a time.",
      prompt: "You are climbing a staircase that takes 'n' steps to reach the top. Each time you can climb 1 or 2 steps. Calculate how many distinct ways you can reach the top. Describe your recurrence relation, complexity, and implement the dynamic programming approach."
    },
    "Graph Search": {
      title: "Grid Pathfinding for Autonomous Warehouse Drones",
      description: "An autonomous warehouse drone needs to navigate a grid map layout from a loading dock to a shipping bay while completely avoiding dynamic physical obstacles.",
      prompt: "Given a 2D binary grid where 0 represents open space and 1 represents obstacles, find the length of the shortest path from the top-left cell to the bottom-right cell. If no path exists, return -1. Implement the search algorithm and explain the complexity."
    }
  },
  Technical_System_Design: {
    "Notifications": {
      title: "Scale a High-Throughput Global Notification Engine",
      description: "Design an enterprise notification pipeline capable of delivering SMS, email, and push notifications to 50M+ users daily during high-velocity events (like flash sales or critical server alerts).",
      prompt: "System Design: Describe the high-level architecture, message ingestion API, load balancers, queueing layers (e.g. Kafka/RabbitMQ), delivery workers, retry mechanisms, and rate limits. Explain how you prevent duplicate notifications and ensure sub-second delivery."
    },
    "Search": {
      title: "Real-Time E-Commerce Search Engine at 100M Scale",
      description: "Build a resilient, lightning-fast product search and filtering service for a catalog of 100 Million items, supporting instant query autocomplete, facet filters, and typo correction.",
      prompt: "System Design: Detail the ingestion pipeline (database to search index), search architecture (Elasticsearch/Solr clusters), autocomplete strategy, caching layer, and scaling plan for handling 10,000 queries per second (QPS)."
    },
    "Rate Limiting": {
      title: "Distributed Edge API Rate Limiter Middleware",
      description: "Your public cloud APIs are being scraped, causing database degradation. You are tasked with designing a distributed, highly available rate limiting middleware to protect downstream microservices.",
      prompt: "System Design: Detail the rate limiting algorithm (Token Bucket, Leaky Bucket, Sliding Window), state storage (Redis clusters), edge proxy integration, fallback policies, and low-latency metrics."
    },
    "File Storage": {
      title: "Distributed Video Asset Storage & Transcoding Pipeline",
      description: "Design a massive media storage system like YouTube or Netflix, where content creators upload large video files that must be transcoded, stored reliably, and served via globally distributed Content Delivery Networks (CDNs).",
      prompt: "System Design: Describe the video upload API, distributed chunking strategy, file storage system (e.g., S3), async transcoding worker pool, metadata database schema, and edge CDN cache eviction strategies."
    },
    "Chat": {
      title: "Real-Time Message Distribution System for WhatsApp/Slack",
      description: "Design a real-time messaging application like WhatsApp or Slack, supporting instant message delivery, group chats, message delivery status (sent, delivered, read), and offline delivery queueing for 10M+ concurrent users.",
      prompt: "System Design: Detail the communication protocols (WebSockets, HTTP Long Polling), connection manager cluster, message routing queues, database persistence for chat history, and push notification sync framework."
    }
  },
  Behavioral: {
    "Leadership": {
      title: "Leading Teams through High-Stakes Technical Debt Conflict",
      description: "Your engineering unit was tasked with migrating a core legacy payments system under a tight product release window. A critical security flaw was discovered halfway through, dividing the team on whether to halt and fix it or ship as is.",
      prompt: "Tell me about a time you had to take the lead during a difficult team technical debate. How did you bring alignment, resolve conflict, manage diverging expectations from stakeholders, and what was the outcome? Use the STAR framework."
    },
    "Conflict Resolution": {
      title: "Handling High-Friction Cross-Functional Engineering Disputes",
      description: "A senior frontend engineer and a principal backend engineer on your project disagree heavily on the API contract, causing missed sprint goals and tension in daily stand-ups.",
      prompt: "Tell me about a time you had a strong disagreement with a colleague or peer. How did you approach them, resolve the conflict constructively, and ensure that delivery timelines were not compromised? Use the STAR framework."
    },
    "Failure and Learning": {
      title: "Recovering and Rebuilding from a Critical Outage",
      description: "A routine code release goes wrong, causing a major 3-hour production outage that costs the company thousands in lost revenue and damages customer trust.",
      prompt: "Talk about a major professional failure or mistake you made. What caused it, how did you handle the immediate aftermath, what did you learn from the retrospective, and how did you apply those lessons to prevent similar issues in the future? Use the STAR framework."
    },
    "Teamwork": {
      title: "Collaborating Under Severe Staffing Constraints",
      description: "Your engineering unit is severely short-staffed due to sudden re-organizations, but your project deliverables and delivery expectations remain identical.",
      prompt: "Describe a time when you had to collaborate closely with a team under high pressure or difficult circumstances to achieve a shared goal. What was your specific contribution to the team's success? Use the STAR framework."
    },
    "Initiative": {
      title: "Proposing and Driving a Major Infrastructure Refactoring",
      description: "You notice that the team's CI/CD pipeline is painfully slow, taking 45 minutes to run, wasting developer hours and stalling deployment cycles. Nobody has scheduled time to fix it.",
      prompt: "Tell me about a time you saw an engineering or workflow problem that was outside your direct responsibility and took the initiative to solve it. How did you pitch the solution, secure buy-in, execute the project, and measure success? Use the STAR framework."
    }
  },
  Situational: {
    "Prioritization": {
      title: "Prioritizing Stability vs Customer Feature Requests",
      description: "Management is pushing hard to launch a new feature to close an enterprise client deal, but your team's on-call alerts are spiking due to severe database connection leaks.",
      prompt: "If you are forced to choose between delivering a critical customer feature or fixing high-severity stability bugs, how do you make that decision? Who do you consult, how do you manage stakeholder expectations, and what metrics guide your choice?"
    },
    "Stakeholder Alignment": {
      title: "Negotiating High-Risk System Proposals",
      description: "A non-technical product manager insists on a feature design that introduces massive architectural security flaws and violates strict data privacy standards.",
      prompt: "How do you explain complex technical risks (like security flaws or scaling limitations) to non-technical business partners to convince them to change their plans? Describe your communication style and approach."
    },
    "Ambiguity": {
      title: "Architecting a Fraud Detection Platform",
      description: "Your VP hands you a one-line objective: 'Build a system that detects fraudulent account logins,' with zero technical specs, defined scope, or user criteria.",
      prompt: "When assigned a highly ambiguous project with vague requirements, how do you proceed? What structured steps do you take to define the scope, gather requirements, build alignment, and validate assumptions?"
    },
    "Escalation": {
      title: "Resolving Blocking Upstream Dependencies",
      description: "A critical upstream API team is late in delivering their endpoints, making it impossible for your team to complete your integration test cycles before the scheduled release.",
      prompt: "When does an issue warrant escalation to senior leadership, and how do you handle the escalation process? How do you keep it objective and focused on resolution rather than assigning blame?"
    },
    "Delivery Risk": {
      title: "Managing Slipping Milestones",
      description: "Two weeks before a firm contract-bound client delivery deadline, you realize that two key engineers are sick and the remaining scope is estimated to take at least four weeks.",
      prompt: "How do you identify, communicate, and mitigate severe delivery risks on a project before they lead to missed launch dates? What options do you propose to stakeholders (e.g. scope cutting, phasing)?"
    }
  },
  HR: {
    "Motivation": {
      title: "Developer Autonomy and Alignment at Scale",
      description: "You are interviewing for a growth-stage company that prides itself on developer autonomy, technical excellence, and rapid shipping culture.",
      prompt: "What motivates you as a software engineer, and why are you interested in joining our organization specifically? What about our culture, business domain, or engineering challenges aligns with your career path?"
    },
    "Career Goals": {
      title: "Five-Year Technical or Leadership Growth Paths",
      description: "The interviewer wants to understand your long-term commitment, leadership potential, and whether you seek technical specialization (IC track) or engineering management.",
      prompt: "What are your long-term career aspirations? Do you see yourself moving down the principal architect path, engineering management path, or something else, and how does this role help you achieve that?"
    },
    "Company Fit": {
      title: "Adapting to Rapid Startup Feedback Loops",
      description: "Our company operates with high autonomy, loose specifications, and rapid feedback loops where plans can change week-to-week based on customer inputs.",
      prompt: "Tell me about the engineering environment where you thrive the most. How do you handle rapid shifts in company direction or priorities, and how do you maintain high productivity and morale?"
    },
    "Salary Expectations": {
      title: "Total Compensation and Value Alignment",
      description: "The recruiter is asking for your salary range and compensation expectations to check if you align with the company's hiring budget.",
      prompt: "What are your salary and total compensation expectations for this position? Frame your response professionally using market research, your experience level, and a collaborative, recruiter-friendly tone."
    },
    "Availability": {
      title: "Onboarding and Transition Timeline",
      description: "The hiring manager needs to understand your notice period at your current job, interview availability, and how soon you can onboard if an offer is extended.",
      prompt: "What is your current notice period and target start date? Do you have any prior commitments or active interview processes that we should consider to align our hiring timelines?"
    }
  }
};

function getQuestionDetails(type: InterviewType, topic: string, difficulty: DifficultyLevel) {
  const template = questionTemplates[type]?.[topic] || {
    title: `${topic} Scenario`,
    description: `A realistic scenario related to ${topic.toLowerCase()} at an intermediate level.`,
    prompt: `Analyze the scenario and discuss the main points.`
  };

  const difficultyContextStr = difficultyContext[difficulty];
  const enhancedDescription = `${template.description} ${difficultyContextStr}`;

  return {
    title: template.title,
    description: enhancedDescription,
    prompt: template.prompt
  };
}

export function buildQuestionBank(): Question[] {
  const difficulties: DifficultyLevel[] = ["Beginner", "Intermediate", "Advanced"];
  const types = Object.keys(topicsByType) as InterviewType[];

  return difficulties.flatMap((difficulty) =>
    types.flatMap((type) =>
      topicsByType[type].map((topic, index) => {
        const id = `${type}-${difficulty}-${index}`;
        const details = getQuestionDetails(type, topic, difficulty);
        const modelAnswer = makeModelAnswer(type, topic, difficulty);
        const constraints = type === "Technical_System_Design" ? makeConstraints(topic, difficulty) : undefined;
        const salaryRange = topic === "Salary Expectations" ? { Beginner: 70000, Intermediate: 110000, Advanced: 165000 } : undefined;

        return {
          id,
          type,
          difficulty,
          topic,
          title: details.title,
          description: details.description,
          prompt: details.prompt,
          examples:
            type === "Technical_Coding"
              ? getCodingExample(topic)
              : undefined,
          hints: [
            `Start by naming the core ${topic.toLowerCase()} decision before expanding the answer.`,
            "Cover the main happy path first, then address edge cases or trade-offs.",
            "Use a concrete example and tie the final choice back to the role and difficulty level.",
          ],
          rubric: makeRubric(type),
          followUpSeed: `Follow-up: go deeper on the weakest part of your ${topic} answer and explain the reasoning behind it.`,
          modelAnswer,
          constraints,
          salaryRange,
        };
      })
    )
  );
}

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function selectQuestions(
  bank: Question[],
  preferredTypes: InterviewType[],
  difficulty: DifficultyLevel,
  count: number,
  role: string = "Software Engineer",
  starredIds: string[] = [],
  flaggedIds: string[] = [],
  onlyFavorites: boolean = false
): Question[] {
  const chosenTypes = preferredTypes.length ? preferredTypes : (Object.keys(topicsByType) as InterviewType[]);
  
  // Filter out flagged questions
  let pool = bank.filter((q) => !flaggedIds.includes(q.id));
  
  // Filter only favorites if checked
  if (onlyFavorites && starredIds.length > 0) {
    pool = pool.filter((q) => starredIds.includes(q.id));
  }

  const poolFiltered = pool.filter((question) => question.difficulty === difficulty && chosenTypes.includes(question.type));
  const plan: Question[] = [];

  const roleLower = role.toLowerCase();
  
  // Separate into role matches and non-matches
  const matchingPool = poolFiltered.filter((q) => isTopicRoleMatch(q.topic, roleLower));
  const nonMatchingPool = poolFiltered.filter((q) => !isTopicRoleMatch(q.topic, roleLower));
  
  // Shuffle both pools independently to ensure variety and randomness across sessions
  const shuffledMatching = shuffleArray(matchingPool);
  const shuffledNonMatching = shuffleArray(nonMatchingPool);
  
  // Concatenate them so matching questions are still prioritized first
  const sortedPool = [...shuffledMatching, ...shuffledNonMatching];

  for (let i = 0; i < Math.min(count, 30); i += 1) {
    const type = chosenTypes[i % chosenTypes.length];
    const nextIndex = sortedPool.findIndex(
      (question) => question.type === type && !plan.some((existing) => existing.id === question.id)
    );
    let next = nextIndex !== -1 ? sortedPool[nextIndex] : undefined;

    if (!next) {
      next = sortedPool.find((question) => !plan.some((existing) => existing.id === question.id));
    }

    if (next) {
      // Customize question prompt to directly match custom target role!
      const customized = {
        ...next,
        prompt: next.prompt.replace("realistic interview problem", `realistic problem faced by a ${role}`),
      };
      plan.push(customized);
    }
  }

  return plan;
}

function isTopicRoleMatch(topic: string, roleLower: string): boolean {
  const topicLower = topic.toLowerCase();
  if (roleLower.includes("frontend") || roleLower.includes("ui") || roleLower.includes("react")) {
    return ["notifications", "chat", "arrays", "hash maps"].includes(topicLower);
  }
  if (roleLower.includes("backend") || roleLower.includes("system") || roleLower.includes("infrastructure")) {
    return ["rate limiting", "file storage", "chat", "graph search", "dynamic programming"].includes(topicLower);
  }
  if (roleLower.includes("manager") || roleLower.includes("lead") || roleLower.includes("product")) {
    return ["prioritization", "stakeholder alignment", "leadership", "teamwork", "escalation"].includes(topicLower);
  }
  return false;
}

function makePrompt(type: InterviewType, topic: string, difficulty: DifficultyLevel) {
  if (type === "Technical_Coding") {
    return `${topic}: Given a realistic interview problem, describe and implement a solution. ${prompts[type]} ${difficultyContext[difficulty]}`;
  }
  return `${topic}: ${prompts[type]} ${difficultyContext[difficulty]}`;
}

function getCodingExample(topic: string): string {
  switch (topic) {
    case "Arrays":
      return "Example: Given nums = [2, 7, 11, 15], target = 9. Return [0, 1] because nums[0] + nums[1] == 9.";
    case "Hash Maps":
      return "Example: Find the first non-repeating character in 'interviewbot'. Return 'n' (index 1).";
    case "Binary Trees":
      return "Example: Invert a binary tree. Input: [4,2,7,1,3,6,9] -> Output: [4,7,2,9,6,3,1].";
    case "Dynamic Programming":
      return "Example: Clibing stairs. You can take 1 or 2 steps. Input: n = 3 -> Output: 3 ways (1+1+1, 1+2, 2+1).";
    case "Graph Search":
      return "Example: Find path in a grid from (0,0) to (n,n) avoiding obstacles. Return shortest path length.";
    default:
      return "Example: Implement a clear algorithmic approach.";
  }
}

function makeConstraints(topic: string, difficulty: DifficultyLevel): string[] {
  const base = ["Must achieve sub-second response times", "Ensure data resilience and failover paths"];
  if (difficulty === "Advanced") {
    base.push("System must support horizontal scaling to > 10 Million Daily Active Users (DAUs)");
    base.push("Must operate under strict Zero-Trust network security rules");
  }
  switch (topic) {
    case "Notifications":
      return [...base, "Allow users to opt out of delivery options", "No SQL database for user state"];
    case "Rate Limiting":
      return [...base, "No external service dependencies for token checking", "Limit overhead to under 5ms"];
    case "File Storage":
      return [...base, "AWS components only (e.g. S3, DynamoDB)", "No block storage allowed"];
    default:
      return base;
  }
}

function makeRubric(type: InterviewType) {
  switch (type) {
    case "Technical_Coding":
      return ["Correctness", "Edge cases", "Complexity", "Communication"];
    case "Technical_System_Design":
      return ["Requirements", "Architecture", "Data model", "Scalability", "Trade-offs"];
    case "Behavioral":
      return ["Situation", "Task", "Action", "Result"];
    case "Situational":
      return ["Reasoning", "Stakeholders", "Practicality"];
    case "HR":
      return ["Clarity", "Role alignment", "Professionalism"];
  }
}

function makeModelAnswer(type: InterviewType, topic: string, difficulty: DifficultyLevel): string {
  if (type === "Technical_Coding") {
    return `### Recommended Solution for ${topic} (${difficulty})

\`\`\`javascript
// Highly optimized approach
function solveChallenge(data, target) {
  // Edge Case validation
  if (!data || data.length === 0) return null;
  
  // High-performance mapping
  const map = new Map();
  for (let i = 0; i < data.length; i++) {
    const complement = target - data[i];
    if (map.has(complement)) {
      return [map.get(complement), i];
    }
    map.set(data[i], i);
  }
  return [];
}
\`\`\`

**Approach & Complexity:**
1. **Approach:** We initialize a Hash Map to index indices in O(1). We perform a single linear scan of the elements.
2. **Time Complexity:** O(N) where N is the size of the elements, since we traverse the list exactly once.
3. **Space Complexity:** O(N) to store elements inside our Hash Map cache.`;
  }

  if (type === "Technical_System_Design") {
    return `### System Architecture Blueprint for ${topic}

**1. High-Level Design Overview:**
We will implement a multi-layered decoupled microservice architecture:
- **API Gateway Layer:** For SSL termination, rate-limiting, and request routing.
- **Application Server (Stateless):** Scaled horizontally via an Auto-Scaling Group behind an Application Load Balancer (ALB).
- **Caching Layer (Redis):** Distributed write-around cache to store active user profiles and sessions.
- **Primary Database (PostgreSQL / DynamoDB):** Replicated storage for persistence.

**2. Component Breakdown & Scaling Plan:**
- Use an asynchronous Message Broker (e.g. RabbitMQ or Kafka) to queue non-blocking tasks.
- Enable Database Sharding based on user partition keys to distribute hot data loads.
- Enforce standard circuit breakers and backoff retry logic.

**3. Primary Trade-offs:**
- **Consistency vs. Availability:** We favor Eventual Consistency (AP system) to maintain high availability under peak loads.`;
  }

  if (type === "Behavioral") {
    return `### Outstanding STAR Framework Answer

**1. Situation:**
At my previous company, we noticed a critical drop-off in user onboarding rates by 18% during a major release phase.

**2. Task:**
I was appointed as the lead engineer to identify, debug, and resolve the underlying database and UI issues within a strict two-week sprint.

**3. Action:**
- I organized a cross-functional war room involving product, QA, and frontend developers.
- I set up APM tracing (Datadog) to isolate high-latency queries.
- I refactored the legacy registration transaction block into smaller, non-blocking processes.

**4. Result:**
We resolved the signup bottle-necks, raising onboarding conversion by 22% (4% above the target baseline), and eliminated late night database locking pages completely.`;
  }

  if (type === "Situational") {
    return `### Professional Action Plan

**1. Immediate Prioritization Strategy:**
I would start by triage assessing the impact. I will map out the risk of each option on a standard Priority Grid (High Impact / High Urgency).

**2. Stakeholder Engagement Loop:**
- **Product Owners:** To outline the core product goals and adjust deliverables.
- **Engineering Staff:** To align on the implementation bottlenecks.
- **Client Managers:** To establish expectation alignment.

**3. Practical Steps & Monitoring Metrics:**
- Step 1: Deploy a hotfix or feature flag to isolate the failure point.
- Step 2: Establish daily sync alignments to maintain continuous check-ins.
- Step 3: Measure success by tracking SLA response times and error rates.`;
  }

  return `### Structured Career Script

**1. Targeted Professional Strategy:**
My approach centers on deep role alignment. I align my core career trajectories directly with company values (e.g. ownership and transparent communication).

**2. High-Impact Professional Script:**
- *Framing Career Trajectory:* "I am looking to leverage my background in cloud infrastructures to resolve core scaling challenges..."
- *Negotiation / Stance:* "Given market averages and my 5+ years of specialized experience, I am targeting a compensation range aligned with standard market bands ($110,000 to $150,000 base), though my priority is finding the right long-term role fit."

**3. Common Mistakes Excluded:**
- Avoid bad-mouthing past supervisors or sharing unpolished personal statements.`;
}
