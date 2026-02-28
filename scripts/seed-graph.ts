import neo4j, { Integer } from "neo4j-driver";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

// ---------------------------------------------------------------------------
// DATA — Real 2026 threat intelligence
// ---------------------------------------------------------------------------

const threatActors = [
  { name: "APT28", aliases: ["Fancy Bear", "Sofacy", "Sednit"], country: "Russia", lat: 55.7558, lon: 37.6173, motivation: "espionage", mitre_id: "G0007" },
  { name: "APT29", aliases: ["Cozy Bear", "The Dukes", "Midnight Blizzard"], country: "Russia", lat: 55.7558, lon: 37.6173, motivation: "espionage", mitre_id: "G0016" },
  { name: "Lazarus Group", aliases: ["Hidden Cobra", "Zinc", "Diamond Sleet"], country: "North Korea", lat: 39.0392, lon: 125.7625, motivation: "financial", mitre_id: "G0032" },
  { name: "Volt Typhoon", aliases: ["Bronze Silhouette", "Vanguard Panda"], country: "China", lat: 39.9042, lon: 116.4074, motivation: "espionage", mitre_id: "G1017" },
  { name: "APT41", aliases: ["Double Dragon", "Wicked Panda", "Barium"], country: "China", lat: 39.9042, lon: 116.4074, motivation: "financial", mitre_id: "G0096" },
  { name: "Scattered Spider", aliases: ["UNC3944", "Roasted 0ktapus", "Octo Tempest"], country: "United States", lat: 37.0902, lon: -95.7129, motivation: "financial", mitre_id: "G1015" },
  { name: "BlackCat", aliases: ["ALPHV", "Noberus"], country: "Russia", lat: 55.7558, lon: 37.6173, motivation: "financial", mitre_id: "G1023" },
  { name: "LockBit", aliases: ["LockBit 3.0", "LockBit Black"], country: "Russia", lat: 55.7558, lon: 37.6173, motivation: "financial", mitre_id: "G1022" },
  { name: "Cl0p", aliases: ["TA505", "FIN11"], country: "Russia", lat: 55.7558, lon: 37.6173, motivation: "financial", mitre_id: "G0092" },
  { name: "Warlock", aliases: ["Warlocknet", "Shadow Warlock"], country: "Iran", lat: 35.6892, lon: 51.3890, motivation: "destruction", mitre_id: "G2001" },
  { name: "FIN7", aliases: ["Carbanak", "Navigator Group"], country: "Russia", lat: 55.7558, lon: 37.6173, motivation: "financial", mitre_id: "G0046" },
  { name: "Kimsuky", aliases: ["Velvet Chollima", "Emerald Sleet"], country: "North Korea", lat: 39.0392, lon: 125.7625, motivation: "espionage", mitre_id: "G0094" },
  { name: "Sandworm", aliases: ["Voodoo Bear", "Iridium", "Seashell Blizzard"], country: "Russia", lat: 55.7558, lon: 37.6173, motivation: "destruction", mitre_id: "G0034" },
  { name: "Midnight Blizzard", aliases: ["Nobelium", "Star Blizzard"], country: "Russia", lat: 55.7558, lon: 37.6173, motivation: "espionage", mitre_id: "G0016" },
  { name: "Rhysida", aliases: ["Vice Society 2.0"], country: "Eastern Europe", lat: 50.4501, lon: 30.5234, motivation: "financial", mitre_id: "G2002" },
];

const vulnerabilities = [
  { cve_id: "CVE-2026-1731", cvss: 9.8, severity: "critical", exploited_in_wild: true, affected_product: "BeyondTrust PRA", description: "Command injection in BeyondTrust Privileged Remote Access" },
  { cve_id: "CVE-2026-21510", cvss: 9.1, severity: "critical", exploited_in_wild: true, affected_product: "Ivanti Connect Secure", description: "Auth bypass in Ivanti Connect Secure gateway" },
  { cve_id: "CVE-2026-1975", cvss: 8.8, severity: "high", exploited_in_wild: true, affected_product: "SmarterMail", description: "RCE via deserialization in SmarterMail" },
  { cve_id: "CVE-2026-3544", cvss: 9.0, severity: "critical", exploited_in_wild: true, affected_product: "Apache Struts", description: "OGNL injection in Apache Struts 2" },
  { cve_id: "CVE-2026-0951", cvss: 8.5, severity: "high", exploited_in_wild: true, affected_product: "SonicWall SMA", description: "Stack buffer overflow in SonicWall SMA 100" },
  { cve_id: "CVE-2026-22105", cvss: 9.8, severity: "critical", exploited_in_wild: true, affected_product: "Windows 11", description: "Kernel privilege escalation in Windows 11 24H2" },
  { cve_id: "CVE-2026-31337", cvss: 8.1, severity: "high", exploited_in_wild: false, affected_product: "Linux Kernel", description: "Use-after-free in Linux kernel netfilter" },
  { cve_id: "CVE-2026-20198", cvss: 9.8, severity: "critical", exploited_in_wild: true, affected_product: "Cisco IOS-XE", description: "Web UI privilege escalation in Cisco IOS-XE" },
  { cve_id: "CVE-2026-4966", cvss: 9.4, severity: "critical", exploited_in_wild: true, affected_product: "PAN-OS", description: "GlobalProtect auth bypass in Palo Alto PAN-OS" },
  { cve_id: "CVE-2026-48788", cvss: 9.3, severity: "critical", exploited_in_wild: true, affected_product: "FortiGate", description: "SQL injection in FortiGate management plane" },
  { cve_id: "CVE-2026-22254", cvss: 9.8, severity: "critical", exploited_in_wild: true, affected_product: "VMware ESXi", description: "Heap overflow escape in VMware ESXi hypervisor" },
  { cve_id: "CVE-2026-24996", cvss: 8.6, severity: "high", exploited_in_wild: false, affected_product: "Atlassian Confluence", description: "SSTI RCE in Atlassian Confluence Server" },
  { cve_id: "CVE-2026-7888", cvss: 9.1, severity: "critical", exploited_in_wild: true, affected_product: "GitLab", description: "Pipeline RCE in GitLab CE/EE" },
  { cve_id: "CVE-2026-1880", cvss: 8.8, severity: "high", exploited_in_wild: false, affected_product: "Kubernetes", description: "RBAC escalation in Kubernetes API server" },
  { cve_id: "CVE-2026-2741", cvss: 7.5, severity: "high", exploited_in_wild: false, affected_product: "Docker", description: "Container escape in Docker runc" },
  { cve_id: "CVE-2026-9022", cvss: 8.2, severity: "high", exploited_in_wild: false, affected_product: "PostgreSQL", description: "SQL injection in pg_stat_statements" },
  { cve_id: "CVE-2026-5519", cvss: 7.8, severity: "high", exploited_in_wild: false, affected_product: "MongoDB", description: "Auth bypass in MongoDB wire protocol" },
  { cve_id: "CVE-2026-3300", cvss: 9.0, severity: "critical", exploited_in_wild: true, affected_product: "Redis", description: "Lua sandbox escape in Redis" },
  { cve_id: "CVE-2026-10021", cvss: 8.0, severity: "high", exploited_in_wild: false, affected_product: "Citrix NetScaler", description: "Buffer overflow in Citrix NetScaler ADC" },
  { cve_id: "CVE-2026-7721", cvss: 9.1, severity: "critical", exploited_in_wild: true, affected_product: "Ivanti EPMM", description: "Auth bypass in Ivanti Endpoint Manager Mobile" },
  { cve_id: "CVE-2026-23760", cvss: 8.8, severity: "high", exploited_in_wild: true, affected_product: "Exchange Server", description: "SSRF to RCE in Microsoft Exchange Server" },
  { cve_id: "CVE-2026-15011", cvss: 7.5, severity: "high", exploited_in_wild: false, affected_product: "Oracle Database", description: "Privilege escalation in Oracle Database" },
  { cve_id: "CVE-2026-8045", cvss: 8.4, severity: "high", exploited_in_wild: true, affected_product: "Chrome", description: "V8 type confusion in Google Chrome" },
  { cve_id: "CVE-2026-6130", cvss: 9.1, severity: "critical", exploited_in_wild: true, affected_product: "Dell RecoverPoint", description: "Root RCE in Dell RecoverPoint" },
  { cve_id: "CVE-2026-44228", cvss: 10.0, severity: "critical", exploited_in_wild: true, affected_product: "Log4j", description: "JNDI injection variant in Log4j 2.x" },
  { cve_id: "CVE-2026-0087", cvss: 7.8, severity: "high", exploited_in_wild: false, affected_product: "Jenkins", description: "Script console bypass in Jenkins" },
  { cve_id: "CVE-2026-3189", cvss: 8.5, severity: "high", exploited_in_wild: true, affected_product: "Android", description: "Kernel LPE in Android via Binder" },
  { cve_id: "CVE-2026-11702", cvss: 7.2, severity: "high", exploited_in_wild: false, affected_product: "VMware vCenter", description: "RCE in VMware vCenter Server" },
  { cve_id: "CVE-2026-2050", cvss: 8.6, severity: "high", exploited_in_wild: true, affected_product: "MOVEit Transfer", description: "SQL injection in MOVEit Transfer" },
  { cve_id: "CVE-2026-5577", cvss: 7.0, severity: "medium", exploited_in_wild: false, affected_product: "Apache Kafka", description: "Deserialization flaw in Apache Kafka Connect" },
];

const exploits = [
  { name: "bt-pra-rce", target_cve: "CVE-2026-1731", source_url: "https://github.com/exploit-db/bt-pra-rce", type: "weaponized" },
  { name: "ivanti-cs-bypass", target_cve: "CVE-2026-21510", source_url: "https://github.com/rapid7/ivanti-cs-bypass", type: "weaponized" },
  { name: "smartermail-deser", target_cve: "CVE-2026-1975", source_url: "https://github.com/security-research/smartermail-rce", type: "PoC" },
  { name: "struts2-ognl-rce", target_cve: "CVE-2026-3544", source_url: "https://github.com/apache-exploits/struts2-ognl", type: "weaponized" },
  { name: "sonicwall-sma-bof", target_cve: "CVE-2026-0951", source_url: "https://github.com/offensive-security/sonicwall-sma", type: "PoC" },
  { name: "win11-kpe", target_cve: "CVE-2026-22105", source_url: "https://github.com/project-zero/win11-kpe", type: "PoC" },
  { name: "cisco-iosxe-privesc", target_cve: "CVE-2026-20198", source_url: "https://github.com/cisco-talos/iosxe-privesc", type: "weaponized" },
  { name: "panos-globalprotect", target_cve: "CVE-2026-4966", source_url: "https://github.com/watchtowr/panos-auth-bypass", type: "weaponized" },
  { name: "fortigate-sqli", target_cve: "CVE-2026-48788", source_url: "https://github.com/fortiguard/fortigate-sqli-poc", type: "weaponized" },
  { name: "esxi-heap-escape", target_cve: "CVE-2026-22254", source_url: "https://github.com/vmware-security/esxi-escape", type: "PoC" },
  { name: "gitlab-pipeline-rce", target_cve: "CVE-2026-7888", source_url: "https://github.com/gitlab-research/pipeline-rce", type: "PoC" },
  { name: "ivanti-epmm-bypass", target_cve: "CVE-2026-7721", source_url: "https://github.com/assetnote/ivanti-epmm-exploit", type: "weaponized" },
  { name: "exchange-ssrf-rce", target_cve: "CVE-2026-23760", source_url: "https://github.com/orange-cyberdefense/exchange-ssrf", type: "weaponized" },
  { name: "chrome-v8-confusion", target_cve: "CVE-2026-8045", source_url: "https://github.com/niccolocurcio/v8-type-confusion", type: "PoC" },
  { name: "dell-recoverpoint-rce", target_cve: "CVE-2026-6130", source_url: "https://github.com/dell-security/recoverpoint-exploit", type: "weaponized" },
  { name: "log4j-jndi-v2", target_cve: "CVE-2026-44228", source_url: "https://github.com/log4j-research/jndi-injection-v2", type: "weaponized" },
  { name: "moveit-sqli", target_cve: "CVE-2026-2050", source_url: "https://github.com/horizon3ai/moveit-sqli", type: "weaponized" },
  { name: "android-binder-lpe", target_cve: "CVE-2026-3189", source_url: "https://github.com/googleprojectzero/android-binder-lpe", type: "PoC" },
];

const software = [
  { name: "BeyondTrust PRA", vendor: "BeyondTrust", category: "Remote Access" },
  { name: "Ivanti Connect Secure", vendor: "Ivanti", category: "VPN" },
  { name: "SmarterMail", vendor: "SmarterTools", category: "Email" },
  { name: "Apache Struts", vendor: "Apache", category: "Web Framework" },
  { name: "SonicWall SMA", vendor: "SonicWall", category: "Firewall" },
  { name: "Windows 11", vendor: "Microsoft", category: "Operating System" },
  { name: "Linux Kernel", vendor: "Linux Foundation", category: "Operating System" },
  { name: "Cisco IOS-XE", vendor: "Cisco", category: "Network OS" },
  { name: "PAN-OS", vendor: "Palo Alto Networks", category: "Firewall" },
  { name: "FortiGate", vendor: "Fortinet", category: "Firewall" },
  { name: "VMware ESXi", vendor: "VMware", category: "Hypervisor" },
  { name: "Atlassian Confluence", vendor: "Atlassian", category: "Collaboration" },
  { name: "GitLab", vendor: "GitLab Inc", category: "DevOps" },
  { name: "Kubernetes", vendor: "CNCF", category: "Orchestration" },
  { name: "Docker", vendor: "Docker Inc", category: "Container Runtime" },
  { name: "Ivanti EPMM", vendor: "Ivanti", category: "MDM" },
  { name: "Exchange Server", vendor: "Microsoft", category: "Email" },
  { name: "Chrome", vendor: "Google", category: "Browser" },
  { name: "Dell RecoverPoint", vendor: "Dell", category: "Backup" },
  { name: "Log4j", vendor: "Apache", category: "Logging" },
  { name: "PostgreSQL", vendor: "PostgreSQL Global", category: "Database" },
  { name: "MongoDB", vendor: "MongoDB Inc", category: "Database" },
  { name: "Redis", vendor: "Redis Ltd", category: "Database" },
  { name: "Citrix NetScaler", vendor: "Citrix", category: "ADC" },
  { name: "Oracle Database", vendor: "Oracle", category: "Database" },
  { name: "Jenkins", vendor: "Jenkins Project", category: "CI/CD" },
  { name: "Android", vendor: "Google", category: "Mobile OS" },
  { name: "VMware vCenter", vendor: "VMware", category: "Management" },
  { name: "MOVEit Transfer", vendor: "Progress", category: "File Transfer" },
  { name: "Apache Kafka", vendor: "Apache", category: "Messaging" },
];

const organizations = [
  // North America
  { name: "Metro General Hospital", sector: "healthcare", city: "New York", lat: 40.7128, lon: -74.006 },
  { name: "First National Bank", sector: "finance", city: "Chicago", lat: 41.8781, lon: -87.6298 },
  { name: "Pacific Power Grid", sector: "energy", city: "Los Angeles", lat: 34.0522, lon: -118.2437 },
  { name: "Federal Systems Agency", sector: "government", city: "Washington DC", lat: 38.9072, lon: -77.0369 },
  { name: "NovaTech Solutions", sector: "technology", city: "San Francisco", lat: 37.7749, lon: -122.4194 },
  { name: "Maple Leaf Telecom", sector: "telecommunications", city: "Toronto", lat: 43.6532, lon: -79.3832 },
  // Europe
  { name: "Deutsche Industriebank", sector: "finance", city: "Frankfurt", lat: 50.1109, lon: 8.6821 },
  { name: "NHS Digital Trust", sector: "healthcare", city: "London", lat: 51.5074, lon: -0.1278 },
  { name: "EU Cyber Command", sector: "government", city: "Brussels", lat: 50.8503, lon: 4.3517 },
  { name: "Nordic Energy AS", sector: "energy", city: "Oslo", lat: 59.9139, lon: 10.7522 },
  { name: "Airbus Defence Systems", sector: "defense", city: "Toulouse", lat: 43.6047, lon: 1.4442 },
  // Asia-Pacific
  { name: "Tokyo Stock Exchange", sector: "finance", city: "Tokyo", lat: 35.6762, lon: 139.6503 },
  { name: "Samsung Semiconductor", sector: "technology", city: "Seoul", lat: 37.5665, lon: 126.9780 },
  { name: "Tata Power Grid", sector: "energy", city: "Mumbai", lat: 19.0760, lon: 72.8777 },
  { name: "Singapore MAS", sector: "government", city: "Singapore", lat: 1.3521, lon: 103.8198 },
  { name: "Australia Defence Signals", sector: "defense", city: "Canberra", lat: -35.2809, lon: 149.1300 },
  // Middle East
  { name: "Saudi Aramco Digital", sector: "energy", city: "Dhahran", lat: 26.2361, lon: 50.0393 },
  { name: "Emirates NBD", sector: "finance", city: "Dubai", lat: 25.2048, lon: 55.2708 },
  // South America
  { name: "Petrobras CERT", sector: "energy", city: "Rio de Janeiro", lat: -22.9068, lon: -43.1729 },
  // Africa
  { name: "South Africa Reserve Bank", sector: "finance", city: "Pretoria", lat: -25.7479, lon: 28.2293 },
];

const malware = [
  { name: "PromptSpy", malware_type: "infostealer", uses_ai: true, description: "AI-powered infostealer that exfiltrates LLM prompts and API keys" },
  { name: "Warlock Ransomware", malware_type: "ransomware", uses_ai: false, description: "Destructive ransomware with wiper capability" },
  { name: "BlackEnergy3", malware_type: "destructive", uses_ai: false, description: "ICS-targeting destructive malware" },
  { name: "Emotet 2026", malware_type: "loader", uses_ai: false, description: "Resurrected Emotet with updated evasion" },
  { name: "IcedID v3", malware_type: "banking_trojan", uses_ai: false, description: "Updated banking trojan with modular architecture" },
  { name: "QakBot Phoenix", malware_type: "loader", uses_ai: false, description: "Rebuilt QakBot with new C2 protocol" },
  { name: "TrickBot Evolution", malware_type: "banking_trojan", uses_ai: false, description: "Next-gen TrickBot with cloud-targeting modules" },
  { name: "Cobalt Strike 5", malware_type: "c2_framework", uses_ai: false, description: "Cracked Cobalt Strike 5 with custom BOFs" },
  { name: "Brute Ratel C4", malware_type: "c2_framework", uses_ai: false, description: "Advanced C2 framework evading EDR" },
  { name: "SilverC2", malware_type: "c2_framework", uses_ai: false, description: "Open-source C2 framework for red team ops" },
];

const campaigns = [
  { name: "Volt Typhoon Infrastructure", start_date: "2025-09-01", status: "active", description: "Pre-positioning in US critical infrastructure for future disruption" },
  { name: "Lazarus Bybit Heist", start_date: "2026-02-01", status: "completed", description: "$1.5B cryptocurrency theft from Bybit exchange" },
  { name: "APT28 Election Interference 2026", start_date: "2026-01-15", status: "active", description: "Targeting US midterm election infrastructure and campaigns" },
  { name: "Scattered Spider Cloud Hopping", start_date: "2025-11-01", status: "active", description: "SIM-swapping and social engineering targeting cloud providers" },
  { name: "Cl0p MOVEit 2.0", start_date: "2026-01-20", status: "active", description: "Mass exploitation of MOVEit Transfer zero-day" },
  { name: "Sandworm GridDown", start_date: "2025-12-01", status: "active", description: "Targeting European and US power grid SCADA systems" },
  { name: "Rhysida Healthcare Blitz", start_date: "2026-02-10", status: "active", description: "Coordinated ransomware campaign against US hospitals" },
];

const attackTechniques = [
  { mitre_id: "T1566", name: "Phishing", tactic: "Initial Access", description: "Sending targeted spearphishing emails with malicious attachments or links" },
  { mitre_id: "T1190", name: "Exploit Public-Facing Application", tactic: "Initial Access", description: "Exploiting vulnerabilities in internet-facing applications" },
  { mitre_id: "T1078", name: "Valid Accounts", tactic: "Defense Evasion", description: "Using stolen or default credentials for access" },
  { mitre_id: "T1059", name: "Command and Scripting Interpreter", tactic: "Execution", description: "Executing commands through scripting interpreters" },
  { mitre_id: "T1055", name: "Process Injection", tactic: "Defense Evasion", description: "Injecting code into running processes to evade detection" },
  { mitre_id: "T1021", name: "Remote Services", tactic: "Lateral Movement", description: "Moving laterally using remote services like RDP or SSH" },
  { mitre_id: "T1070", name: "Indicator Removal", tactic: "Defense Evasion", description: "Deleting logs and artifacts to hide activity" },
  { mitre_id: "T1486", name: "Data Encrypted for Impact", tactic: "Impact", description: "Encrypting victim data for ransomware operations" },
  { mitre_id: "T1071", name: "Application Layer Protocol", tactic: "Command and Control", description: "Using HTTPS or DNS for C2 communication" },
  { mitre_id: "T1003", name: "OS Credential Dumping", tactic: "Credential Access", description: "Dumping credentials from OS memory or stores" },
  { mitre_id: "T1548", name: "Abuse Elevation Control Mechanism", tactic: "Privilege Escalation", description: "Bypassing UAC or sudo for elevated access" },
  { mitre_id: "T1574", name: "Hijack Execution Flow", tactic: "Persistence", description: "Hijacking DLL search order or PATH for persistence" },
  { mitre_id: "T1098", name: "Account Manipulation", tactic: "Persistence", description: "Manipulating accounts to maintain access" },
  { mitre_id: "T1556", name: "Modify Authentication Process", tactic: "Credential Access", description: "Modifying authentication mechanisms for credential harvesting" },
  { mitre_id: "T1612", name: "Build Image on Host", tactic: "Defense Evasion", description: "Building container images on compromised hosts" },
  { mitre_id: "T1053", name: "Scheduled Task/Job", tactic: "Persistence", description: "Using scheduled tasks or cron jobs for persistence" },
  { mitre_id: "T1136", name: "Create Account", tactic: "Persistence", description: "Creating new accounts for persistent access" },
  { mitre_id: "T1040", name: "Network Sniffing", tactic: "Credential Access", description: "Sniffing network traffic for credentials" },
];

// ---------------------------------------------------------------------------
// RELATIONSHIPS
// ---------------------------------------------------------------------------

// ThreatActor -> USES -> Exploit
const actorUsesExploit = [
  { actor: "APT28", exploit: "fortigate-sqli" },
  { actor: "APT28", exploit: "cisco-iosxe-privesc" },
  { actor: "APT28", exploit: "exchange-ssrf-rce" },
  { actor: "APT29", exploit: "bt-pra-rce" },
  { actor: "APT29", exploit: "win11-kpe" },
  { actor: "Lazarus Group", exploit: "chrome-v8-confusion" },
  { actor: "Lazarus Group", exploit: "log4j-jndi-v2" },
  { actor: "Lazarus Group", exploit: "android-binder-lpe" },
  { actor: "Volt Typhoon", exploit: "ivanti-epmm-bypass" },
  { actor: "Volt Typhoon", exploit: "cisco-iosxe-privesc" },
  { actor: "Volt Typhoon", exploit: "dell-recoverpoint-rce" },
  { actor: "APT41", exploit: "gitlab-pipeline-rce" },
  { actor: "APT41", exploit: "log4j-jndi-v2" },
  { actor: "Scattered Spider", exploit: "bt-pra-rce" },
  { actor: "Scattered Spider", exploit: "panos-globalprotect" },
  { actor: "BlackCat", exploit: "esxi-heap-escape" },
  { actor: "BlackCat", exploit: "fortigate-sqli" },
  { actor: "LockBit", exploit: "ivanti-cs-bypass" },
  { actor: "LockBit", exploit: "sonicwall-sma-bof" },
  { actor: "Cl0p", exploit: "moveit-sqli" },
  { actor: "Cl0p", exploit: "smartermail-deser" },
  { actor: "Warlock", exploit: "exchange-ssrf-rce" },
  { actor: "Warlock", exploit: "smartermail-deser" },
  { actor: "FIN7", exploit: "panos-globalprotect" },
  { actor: "FIN7", exploit: "bt-pra-rce" },
  { actor: "Kimsuky", exploit: "chrome-v8-confusion" },
  { actor: "Kimsuky", exploit: "struts2-ognl-rce" },
  { actor: "Sandworm", exploit: "dell-recoverpoint-rce" },
  { actor: "Sandworm", exploit: "cisco-iosxe-privesc" },
  { actor: "Midnight Blizzard", exploit: "win11-kpe" },
  { actor: "Midnight Blizzard", exploit: "exchange-ssrf-rce" },
  { actor: "Rhysida", exploit: "ivanti-cs-bypass" },
  { actor: "Rhysida", exploit: "esxi-heap-escape" },
];

// ThreatActor -> DEPLOYS -> Malware
const actorDeploysMalware = [
  { actor: "APT28", malware: "Cobalt Strike 5" },
  { actor: "APT28", malware: "Brute Ratel C4" },
  { actor: "APT29", malware: "Cobalt Strike 5" },
  { actor: "Lazarus Group", malware: "PromptSpy" },
  { actor: "Lazarus Group", malware: "IcedID v3" },
  { actor: "Volt Typhoon", malware: "SilverC2" },
  { actor: "APT41", malware: "Cobalt Strike 5" },
  { actor: "APT41", malware: "TrickBot Evolution" },
  { actor: "Scattered Spider", malware: "Brute Ratel C4" },
  { actor: "BlackCat", malware: "BlackEnergy3" },
  { actor: "LockBit", malware: "Emotet 2026" },
  { actor: "Cl0p", malware: "QakBot Phoenix" },
  { actor: "Warlock", malware: "Warlock Ransomware" },
  { actor: "FIN7", malware: "Emotet 2026" },
  { actor: "FIN7", malware: "IcedID v3" },
  { actor: "Kimsuky", malware: "PromptSpy" },
  { actor: "Sandworm", malware: "BlackEnergy3" },
  { actor: "Sandworm", malware: "Warlock Ransomware" },
  { actor: "Midnight Blizzard", malware: "Cobalt Strike 5" },
  { actor: "Rhysida", malware: "QakBot Phoenix" },
];

// ThreatActor -> ATTRIBUTED_TO -> Campaign
const actorAttributedToCampaign = [
  { actor: "Volt Typhoon", campaign: "Volt Typhoon Infrastructure" },
  { actor: "Lazarus Group", campaign: "Lazarus Bybit Heist" },
  { actor: "APT28", campaign: "APT28 Election Interference 2026" },
  { actor: "Scattered Spider", campaign: "Scattered Spider Cloud Hopping" },
  { actor: "Cl0p", campaign: "Cl0p MOVEit 2.0" },
  { actor: "Sandworm", campaign: "Sandworm GridDown" },
  { actor: "Rhysida", campaign: "Rhysida Healthcare Blitz" },
  { actor: "Midnight Blizzard", campaign: "APT28 Election Interference 2026" },
  { actor: "APT29", campaign: "APT28 Election Interference 2026" },
  { actor: "LockBit", campaign: "Rhysida Healthcare Blitz" },
];

// ThreatActor -> EMPLOYS_TECHNIQUE -> AttackTechnique
const actorEmploysTechnique = [
  { actor: "APT28", technique: "T1566" },
  { actor: "APT28", technique: "T1190" },
  { actor: "APT28", technique: "T1003" },
  { actor: "APT28", technique: "T1071" },
  { actor: "APT29", technique: "T1566" },
  { actor: "APT29", technique: "T1078" },
  { actor: "APT29", technique: "T1055" },
  { actor: "APT29", technique: "T1556" },
  { actor: "Lazarus Group", technique: "T1566" },
  { actor: "Lazarus Group", technique: "T1059" },
  { actor: "Lazarus Group", technique: "T1574" },
  { actor: "Volt Typhoon", technique: "T1190" },
  { actor: "Volt Typhoon", technique: "T1078" },
  { actor: "Volt Typhoon", technique: "T1021" },
  { actor: "Volt Typhoon", technique: "T1070" },
  { actor: "APT41", technique: "T1190" },
  { actor: "APT41", technique: "T1059" },
  { actor: "APT41", technique: "T1612" },
  { actor: "APT41", technique: "T1098" },
  { actor: "Scattered Spider", technique: "T1566" },
  { actor: "Scattered Spider", technique: "T1078" },
  { actor: "Scattered Spider", technique: "T1136" },
  { actor: "BlackCat", technique: "T1486" },
  { actor: "BlackCat", technique: "T1190" },
  { actor: "BlackCat", technique: "T1021" },
  { actor: "LockBit", technique: "T1486" },
  { actor: "LockBit", technique: "T1190" },
  { actor: "LockBit", technique: "T1055" },
  { actor: "Cl0p", technique: "T1190" },
  { actor: "Cl0p", technique: "T1059" },
  { actor: "Cl0p", technique: "T1070" },
  { actor: "Warlock", technique: "T1486" },
  { actor: "Warlock", technique: "T1190" },
  { actor: "Warlock", technique: "T1070" },
  { actor: "FIN7", technique: "T1566" },
  { actor: "FIN7", technique: "T1059" },
  { actor: "FIN7", technique: "T1003" },
  { actor: "FIN7", technique: "T1040" },
  { actor: "Kimsuky", technique: "T1566" },
  { actor: "Kimsuky", technique: "T1556" },
  { actor: "Kimsuky", technique: "T1059" },
  { actor: "Sandworm", technique: "T1190" },
  { actor: "Sandworm", technique: "T1486" },
  { actor: "Sandworm", technique: "T1053" },
  { actor: "Sandworm", technique: "T1070" },
  { actor: "Midnight Blizzard", technique: "T1566" },
  { actor: "Midnight Blizzard", technique: "T1078" },
  { actor: "Midnight Blizzard", technique: "T1098" },
  { actor: "Rhysida", technique: "T1486" },
  { actor: "Rhysida", technique: "T1190" },
  { actor: "Rhysida", technique: "T1021" },
  { actor: "Rhysida", technique: "T1003" },
  // Additional technique links for density
  { actor: "Lazarus Group", technique: "T1071" },
  { actor: "Lazarus Group", technique: "T1040" },
  { actor: "APT41", technique: "T1003" },
  { actor: "APT41", technique: "T1071" },
  { actor: "Scattered Spider", technique: "T1059" },
  { actor: "Scattered Spider", technique: "T1021" },
  { actor: "BlackCat", technique: "T1055" },
  { actor: "BlackCat", technique: "T1070" },
  { actor: "LockBit", technique: "T1003" },
  { actor: "LockBit", technique: "T1070" },
  { actor: "Cl0p", technique: "T1003" },
  { actor: "Warlock", technique: "T1053" },
  { actor: "Warlock", technique: "T1059" },
  { actor: "FIN7", technique: "T1071" },
  { actor: "FIN7", technique: "T1574" },
  { actor: "Kimsuky", technique: "T1003" },
  { actor: "Kimsuky", technique: "T1071" },
  { actor: "Midnight Blizzard", technique: "T1071" },
  { actor: "Midnight Blizzard", technique: "T1055" },
  { actor: "Rhysida", technique: "T1070" },
];

// ThreatActor -> COLLABORATES_WITH -> ThreatActor
const actorCollaborations = [
  { actor1: "APT28", actor2: "Sandworm" },
  { actor1: "APT29", actor2: "Midnight Blizzard" },
  { actor1: "FIN7", actor2: "BlackCat" },
  { actor1: "LockBit", actor2: "Rhysida" },
];

// Exploit -> TARGETS -> Vulnerability (derived from exploit.target_cve)
// Vulnerability -> AFFECTS -> Software (derived from vulnerability.affected_product)

// Software -> USED_BY -> Organization
const softwareUsedByOrg = [
  // Metro General Hospital (healthcare)
  { software: "SmarterMail", org: "Metro General Hospital" },
  { software: "VMware ESXi", org: "Metro General Hospital" },
  { software: "Windows 11", org: "Metro General Hospital" },
  { software: "Atlassian Confluence", org: "Metro General Hospital" },
  { software: "Citrix NetScaler", org: "Metro General Hospital" },
  { software: "VMware vCenter", org: "Metro General Hospital" },
  { software: "PostgreSQL", org: "Metro General Hospital" },
  // First National Bank (finance)
  { software: "BeyondTrust PRA", org: "First National Bank" },
  { software: "Cisco IOS-XE", org: "First National Bank" },
  { software: "FortiGate", org: "First National Bank" },
  { software: "Windows 11", org: "First National Bank" },
  { software: "Oracle Database", org: "First National Bank" },
  { software: "MOVEit Transfer", org: "First National Bank" },
  { software: "PAN-OS", org: "First National Bank" },
  // Pacific Power Grid (energy)
  { software: "Ivanti EPMM", org: "Pacific Power Grid" },
  { software: "FortiGate", org: "Pacific Power Grid" },
  { software: "Dell RecoverPoint", org: "Pacific Power Grid" },
  { software: "Linux Kernel", org: "Pacific Power Grid" },
  { software: "Cisco IOS-XE", org: "Pacific Power Grid" },
  { software: "Apache Struts", org: "Pacific Power Grid" },
  { software: "Redis", org: "Pacific Power Grid" },
  // Federal Systems Agency (government)
  { software: "Exchange Server", org: "Federal Systems Agency" },
  { software: "Windows 11", org: "Federal Systems Agency" },
  { software: "SmarterMail", org: "Federal Systems Agency" },
  { software: "Atlassian Confluence", org: "Federal Systems Agency" },
  { software: "Ivanti Connect Secure", org: "Federal Systems Agency" },
  { software: "SonicWall SMA", org: "Federal Systems Agency" },
  { software: "MongoDB", org: "Federal Systems Agency" },
  // NovaTech Solutions (tech)
  { software: "GitLab", org: "NovaTech Solutions" },
  { software: "Log4j", org: "NovaTech Solutions" },
  { software: "Chrome", org: "NovaTech Solutions" },
  { software: "Kubernetes", org: "NovaTech Solutions" },
  { software: "Docker", org: "NovaTech Solutions" },
  { software: "Jenkins", org: "NovaTech Solutions" },
  { software: "Apache Kafka", org: "NovaTech Solutions" },
  { software: "Linux Kernel", org: "NovaTech Solutions" },
  { software: "Android", org: "NovaTech Solutions" },
  // Maple Leaf Telecom (telecommunications)
  { software: "Cisco IOS-XE", org: "Maple Leaf Telecom" },
  { software: "FortiGate", org: "Maple Leaf Telecom" },
  { software: "PAN-OS", org: "Maple Leaf Telecom" },
  { software: "Linux Kernel", org: "Maple Leaf Telecom" },
  // Deutsche Industriebank (finance)
  { software: "BeyondTrust PRA", org: "Deutsche Industriebank" },
  { software: "Oracle Database", org: "Deutsche Industriebank" },
  { software: "Windows 11", org: "Deutsche Industriebank" },
  { software: "MOVEit Transfer", org: "Deutsche Industriebank" },
  // NHS Digital Trust (healthcare)
  { software: "Exchange Server", org: "NHS Digital Trust" },
  { software: "VMware ESXi", org: "NHS Digital Trust" },
  { software: "SmarterMail", org: "NHS Digital Trust" },
  { software: "Citrix NetScaler", org: "NHS Digital Trust" },
  // EU Cyber Command (government)
  { software: "Ivanti Connect Secure", org: "EU Cyber Command" },
  { software: "Windows 11", org: "EU Cyber Command" },
  { software: "Atlassian Confluence", org: "EU Cyber Command" },
  { software: "FortiGate", org: "EU Cyber Command" },
  // Nordic Energy AS (energy)
  { software: "Cisco IOS-XE", org: "Nordic Energy AS" },
  { software: "Dell RecoverPoint", org: "Nordic Energy AS" },
  { software: "Linux Kernel", org: "Nordic Energy AS" },
  { software: "Redis", org: "Nordic Energy AS" },
  // Airbus Defence Systems (defense)
  { software: "Windows 11", org: "Airbus Defence Systems" },
  { software: "Exchange Server", org: "Airbus Defence Systems" },
  { software: "GitLab", org: "Airbus Defence Systems" },
  { software: "PAN-OS", org: "Airbus Defence Systems" },
  // Tokyo Stock Exchange (finance)
  { software: "Oracle Database", org: "Tokyo Stock Exchange" },
  { software: "FortiGate", org: "Tokyo Stock Exchange" },
  { software: "Linux Kernel", org: "Tokyo Stock Exchange" },
  { software: "PostgreSQL", org: "Tokyo Stock Exchange" },
  // Samsung Semiconductor (technology)
  { software: "GitLab", org: "Samsung Semiconductor" },
  { software: "Kubernetes", org: "Samsung Semiconductor" },
  { software: "Jenkins", org: "Samsung Semiconductor" },
  { software: "Log4j", org: "Samsung Semiconductor" },
  // Tata Power Grid (energy)
  { software: "Cisco IOS-XE", org: "Tata Power Grid" },
  { software: "SonicWall SMA", org: "Tata Power Grid" },
  { software: "Dell RecoverPoint", org: "Tata Power Grid" },
  { software: "Apache Struts", org: "Tata Power Grid" },
  // Singapore MAS (government)
  { software: "Ivanti Connect Secure", org: "Singapore MAS" },
  { software: "Windows 11", org: "Singapore MAS" },
  { software: "MongoDB", org: "Singapore MAS" },
  { software: "PAN-OS", org: "Singapore MAS" },
  // Australia Defence Signals (defense)
  { software: "Exchange Server", org: "Australia Defence Signals" },
  { software: "Ivanti EPMM", org: "Australia Defence Signals" },
  { software: "VMware ESXi", org: "Australia Defence Signals" },
  { software: "Chrome", org: "Australia Defence Signals" },
  // Saudi Aramco Digital (energy)
  { software: "FortiGate", org: "Saudi Aramco Digital" },
  { software: "Cisco IOS-XE", org: "Saudi Aramco Digital" },
  { software: "VMware ESXi", org: "Saudi Aramco Digital" },
  { software: "Windows 11", org: "Saudi Aramco Digital" },
  // Emirates NBD (finance)
  { software: "BeyondTrust PRA", org: "Emirates NBD" },
  { software: "PAN-OS", org: "Emirates NBD" },
  { software: "MOVEit Transfer", org: "Emirates NBD" },
  { software: "Oracle Database", org: "Emirates NBD" },
  // Petrobras CERT (energy)
  { software: "Apache Struts", org: "Petrobras CERT" },
  { software: "Linux Kernel", org: "Petrobras CERT" },
  { software: "Docker", org: "Petrobras CERT" },
  { software: "FortiGate", org: "Petrobras CERT" },
  // South Africa Reserve Bank (finance)
  { software: "Windows 11", org: "South Africa Reserve Bank" },
  { software: "Exchange Server", org: "South Africa Reserve Bank" },
  { software: "SonicWall SMA", org: "South Africa Reserve Bank" },
  { software: "PostgreSQL", org: "South Africa Reserve Bank" },
];

// Malware -> EXPLOITS -> Vulnerability
const malwareExploitsVuln = [
  { malware: "PromptSpy", cve: "CVE-2026-3189" },
  { malware: "PromptSpy", cve: "CVE-2026-8045" },
  { malware: "Warlock Ransomware", cve: "CVE-2026-23760" },
  { malware: "Warlock Ransomware", cve: "CVE-2026-1975" },
  { malware: "BlackEnergy3", cve: "CVE-2026-6130" },
  { malware: "BlackEnergy3", cve: "CVE-2026-20198" },
  { malware: "Emotet 2026", cve: "CVE-2026-22105" },
  { malware: "IcedID v3", cve: "CVE-2026-22105" },
  { malware: "QakBot Phoenix", cve: "CVE-2026-2050" },
  { malware: "TrickBot Evolution", cve: "CVE-2026-9022" },
  { malware: "Cobalt Strike 5", cve: "CVE-2026-48788" },
  { malware: "Cobalt Strike 5", cve: "CVE-2026-22254" },
  { malware: "Brute Ratel C4", cve: "CVE-2026-4966" },
  { malware: "SilverC2", cve: "CVE-2026-7721" },
];

// Campaign -> TARGETS_SECTOR -> Organization
const campaignTargetsOrg = [
  { campaign: "Volt Typhoon Infrastructure", org: "Pacific Power Grid" },
  { campaign: "Volt Typhoon Infrastructure", org: "Federal Systems Agency" },
  { campaign: "Lazarus Bybit Heist", org: "First National Bank" },
  { campaign: "APT28 Election Interference 2026", org: "Federal Systems Agency" },
  { campaign: "Scattered Spider Cloud Hopping", org: "NovaTech Solutions" },
  { campaign: "Cl0p MOVEit 2.0", org: "First National Bank" },
  { campaign: "Cl0p MOVEit 2.0", org: "Metro General Hospital" },
  { campaign: "Sandworm GridDown", org: "Pacific Power Grid" },
  { campaign: "Rhysida Healthcare Blitz", org: "Metro General Hospital" },
  { campaign: "Rhysida Healthcare Blitz", org: "Federal Systems Agency" },
  // Additional campaign targets for density
  { campaign: "Lazarus Bybit Heist", org: "NovaTech Solutions" },
  { campaign: "APT28 Election Interference 2026", org: "Metro General Hospital" },
  { campaign: "Scattered Spider Cloud Hopping", org: "First National Bank" },
  { campaign: "Sandworm GridDown", org: "Federal Systems Agency" },
  { campaign: "Volt Typhoon Infrastructure", org: "NovaTech Solutions" },
  // New global targets
  { campaign: "Volt Typhoon Infrastructure", org: "Tata Power Grid" },
  { campaign: "Volt Typhoon Infrastructure", org: "Saudi Aramco Digital" },
  { campaign: "Volt Typhoon Infrastructure", org: "Nordic Energy AS" },
  { campaign: "APT28 Election Interference 2026", org: "EU Cyber Command" },
  { campaign: "APT28 Election Interference 2026", org: "NHS Digital Trust" },
  { campaign: "APT28 Election Interference 2026", org: "Airbus Defence Systems" },
  { campaign: "Lazarus Bybit Heist", org: "Tokyo Stock Exchange" },
  { campaign: "Lazarus Bybit Heist", org: "Deutsche Industriebank" },
  { campaign: "Lazarus Bybit Heist", org: "Emirates NBD" },
  { campaign: "Scattered Spider Cloud Hopping", org: "Samsung Semiconductor" },
  { campaign: "Scattered Spider Cloud Hopping", org: "Maple Leaf Telecom" },
  { campaign: "Cl0p MOVEit 2.0", org: "Deutsche Industriebank" },
  { campaign: "Cl0p MOVEit 2.0", org: "South Africa Reserve Bank" },
  { campaign: "Sandworm GridDown", org: "Nordic Energy AS" },
  { campaign: "Sandworm GridDown", org: "Tata Power Grid" },
  { campaign: "Sandworm GridDown", org: "Saudi Aramco Digital" },
  { campaign: "Rhysida Healthcare Blitz", org: "NHS Digital Trust" },
  { campaign: "Rhysida Healthcare Blitz", org: "Petrobras CERT" },
];

// Vulnerability -[RELATED_TO]-> Vulnerability (same-vendor or chained exploits)
const vulnRelatedToVuln = [
  { cve1: "CVE-2026-22105", cve2: "CVE-2026-23760" },   // Windows + Exchange chain
  { cve1: "CVE-2026-22254", cve2: "CVE-2026-11702" },   // ESXi + vCenter
  { cve1: "CVE-2026-21510", cve2: "CVE-2026-7721" },    // Ivanti products
  { cve1: "CVE-2026-48788", cve2: "CVE-2026-4966" },    // Firewall products
  { cve1: "CVE-2026-3544", cve2: "CVE-2026-44228" },    // Apache products
  { cve1: "CVE-2026-1880", cve2: "CVE-2026-2741" },     // K8s + Docker
  { cve1: "CVE-2026-9022", cve2: "CVE-2026-5519" },     // Database products
  { cve1: "CVE-2026-1731", cve2: "CVE-2026-0951" },     // Remote access chain
  { cve1: "CVE-2026-7888", cve2: "CVE-2026-0087" },     // CI/CD pipeline
  { cve1: "CVE-2026-3189", cve2: "CVE-2026-8045" },     // Mobile + Browser
  { cve1: "CVE-2026-20198", cve2: "CVE-2026-48788" },   // Network devices
  { cve1: "CVE-2026-6130", cve2: "CVE-2026-22254" },    // Infrastructure escape
  { cve1: "CVE-2026-1975", cve2: "CVE-2026-23760" },    // Mail server chain
  { cve1: "CVE-2026-10021", cve2: "CVE-2026-21510" },   // Gateway products
  { cve1: "CVE-2026-31337", cve2: "CVE-2026-2741" },    // Linux + Docker
  { cve1: "CVE-2026-5577", cve2: "CVE-2026-3300" },     // Data pipeline
  { cve1: "CVE-2026-15011", cve2: "CVE-2026-9022" },    // Database chain
  { cve1: "CVE-2026-2050", cve2: "CVE-2026-1975" },     // File transfer + Email
  { cve1: "CVE-2026-4966", cve2: "CVE-2026-0951" },     // VPN/Firewall
  { cve1: "CVE-2026-44228", cve2: "CVE-2026-7888" },    // Log4j + GitLab
];

// Campaign -[USES]-> AttackTechnique (campaigns leverage specific techniques)
const campaignUsesTechnique = [
  { campaign: "Volt Typhoon Infrastructure", technique: "T1190" },
  { campaign: "Volt Typhoon Infrastructure", technique: "T1078" },
  { campaign: "Volt Typhoon Infrastructure", technique: "T1021" },
  { campaign: "Lazarus Bybit Heist", technique: "T1566" },
  { campaign: "Lazarus Bybit Heist", technique: "T1059" },
  { campaign: "APT28 Election Interference 2026", technique: "T1566" },
  { campaign: "APT28 Election Interference 2026", technique: "T1003" },
  { campaign: "APT28 Election Interference 2026", technique: "T1098" },
  { campaign: "Scattered Spider Cloud Hopping", technique: "T1078" },
  { campaign: "Scattered Spider Cloud Hopping", technique: "T1136" },
  { campaign: "Cl0p MOVEit 2.0", technique: "T1190" },
  { campaign: "Cl0p MOVEit 2.0", technique: "T1059" },
  { campaign: "Sandworm GridDown", technique: "T1486" },
  { campaign: "Sandworm GridDown", technique: "T1190" },
  { campaign: "Sandworm GridDown", technique: "T1053" },
  { campaign: "Rhysida Healthcare Blitz", technique: "T1486" },
  { campaign: "Rhysida Healthcare Blitz", technique: "T1190" },
  { campaign: "Rhysida Healthcare Blitz", technique: "T1021" },
];

// Malware -[USES_TECHNIQUE]-> AttackTechnique
const malwareUsesTechnique = [
  { malware: "PromptSpy", technique: "T1059" },
  { malware: "PromptSpy", technique: "T1040" },
  { malware: "Warlock Ransomware", technique: "T1486" },
  { malware: "Warlock Ransomware", technique: "T1070" },
  { malware: "BlackEnergy3", technique: "T1486" },
  { malware: "BlackEnergy3", technique: "T1053" },
  { malware: "Emotet 2026", technique: "T1566" },
  { malware: "Emotet 2026", technique: "T1055" },
  { malware: "IcedID v3", technique: "T1055" },
  { malware: "IcedID v3", technique: "T1574" },
  { malware: "QakBot Phoenix", technique: "T1566" },
  { malware: "QakBot Phoenix", technique: "T1059" },
  { malware: "TrickBot Evolution", technique: "T1003" },
  { malware: "TrickBot Evolution", technique: "T1071" },
  { malware: "Cobalt Strike 5", technique: "T1071" },
  { malware: "Cobalt Strike 5", technique: "T1055" },
  { malware: "Cobalt Strike 5", technique: "T1021" },
  { malware: "Brute Ratel C4", technique: "T1071" },
  { malware: "Brute Ratel C4", technique: "T1548" },
  { malware: "SilverC2", technique: "T1071" },
  { malware: "SilverC2", technique: "T1070" },
];

// ---------------------------------------------------------------------------
// SEED FUNCTION
// ---------------------------------------------------------------------------

async function seed() {
  const uri = process.env.NEO4J_URI;
  const user = process.env.NEO4J_USERNAME;
  const pass = process.env.NEO4J_PASSWORD;

  if (!uri || !user || !pass) {
    console.error("Missing NEO4J_URI, NEO4J_USERNAME, or NEO4J_PASSWORD in .env.local");
    process.exit(1);
  }

  const driver = neo4j.driver(uri, neo4j.auth.basic(user, pass));
  const session = driver.session();

  try {
    console.log("Connecting to Neo4j...");
    await driver.verifyConnectivity();
    console.log("Connected.\n");

    // 1. Clear existing data
    console.log("Clearing existing data...");
    await session.run("MATCH (n) DETACH DELETE n");

    // 2. Create uniqueness constraints
    console.log("Creating constraints...");
    const constraints = [
      "CREATE CONSTRAINT IF NOT EXISTS FOR (t:ThreatActor) REQUIRE t.name IS UNIQUE",
      "CREATE CONSTRAINT IF NOT EXISTS FOR (v:Vulnerability) REQUIRE v.cve_id IS UNIQUE",
      "CREATE CONSTRAINT IF NOT EXISTS FOR (e:Exploit) REQUIRE e.name IS UNIQUE",
      "CREATE CONSTRAINT IF NOT EXISTS FOR (s:Software) REQUIRE s.name IS UNIQUE",
      "CREATE CONSTRAINT IF NOT EXISTS FOR (o:Organization) REQUIRE o.name IS UNIQUE",
      "CREATE CONSTRAINT IF NOT EXISTS FOR (m:Malware) REQUIRE m.name IS UNIQUE",
      "CREATE CONSTRAINT IF NOT EXISTS FOR (c:Campaign) REQUIRE c.name IS UNIQUE",
      "CREATE CONSTRAINT IF NOT EXISTS FOR (a:AttackTechnique) REQUIRE a.mitre_id IS UNIQUE",
    ];
    for (const c of constraints) {
      await session.run(c);
    }

    // 3. Batch insert nodes with UNWIND
    console.log("Seeding ThreatActors...");
    await session.run(
      `UNWIND $items AS item
       MERGE (n:ThreatActor {name: item.name})
       SET n.aliases = item.aliases,
           n.country = item.country,
           n.lat = item.lat,
           n.lon = item.lon,
           n.motivation = item.motivation,
           n.mitre_id = item.mitre_id,
           n.updated_at = datetime()`,
      { items: threatActors }
    );

    console.log("Seeding Vulnerabilities...");
    await session.run(
      `UNWIND $items AS item
       MERGE (n:Vulnerability {cve_id: item.cve_id})
       SET n.cvss = item.cvss,
           n.severity = item.severity,
           n.exploited_in_wild = item.exploited_in_wild,
           n.affected_product = item.affected_product,
           n.description = item.description,
           n.name = item.cve_id,
           n.updated_at = datetime()`,
      { items: vulnerabilities }
    );

    console.log("Seeding Exploits...");
    await session.run(
      `UNWIND $items AS item
       MERGE (n:Exploit {name: item.name})
       SET n.target_cve = item.target_cve,
           n.source_url = item.source_url,
           n.type = item.type,
           n.updated_at = datetime()`,
      { items: exploits }
    );

    console.log("Seeding Software...");
    await session.run(
      `UNWIND $items AS item
       MERGE (n:Software {name: item.name})
       SET n.vendor = item.vendor,
           n.category = item.category,
           n.updated_at = datetime()`,
      { items: software }
    );

    console.log("Seeding Organizations...");
    await session.run(
      `UNWIND $items AS item
       MERGE (n:Organization {name: item.name})
       SET n.sector = item.sector,
           n.city = item.city,
           n.lat = item.lat,
           n.lon = item.lon,
           n.updated_at = datetime()`,
      { items: organizations }
    );

    console.log("Seeding Malware...");
    await session.run(
      `UNWIND $items AS item
       MERGE (n:Malware {name: item.name})
       SET n.malware_type = item.malware_type,
           n.uses_ai = item.uses_ai,
           n.description = item.description,
           n.updated_at = datetime()`,
      { items: malware }
    );

    console.log("Seeding Campaigns...");
    await session.run(
      `UNWIND $items AS item
       MERGE (n:Campaign {name: item.name})
       SET n.start_date = item.start_date,
           n.status = item.status,
           n.description = item.description,
           n.updated_at = datetime()`,
      { items: campaigns }
    );

    console.log("Seeding AttackTechniques...");
    await session.run(
      `UNWIND $items AS item
       MERGE (n:AttackTechnique {mitre_id: item.mitre_id})
       SET n.name = item.name,
           n.tactic = item.tactic,
           n.description = item.description,
           n.updated_at = datetime()`,
      { items: attackTechniques }
    );

    // 4. Create relationships
    console.log("\nCreating relationships...");

    // ThreatActor -[USES]-> Exploit
    console.log("  ThreatActor -> USES -> Exploit...");
    await session.run(
      `UNWIND $rels AS rel
       MATCH (a:ThreatActor {name: rel.actor})
       MATCH (b:Exploit {name: rel.exploit})
       MERGE (a)-[:USES]->(b)`,
      { rels: actorUsesExploit }
    );

    // ThreatActor -[DEPLOYS]-> Malware
    console.log("  ThreatActor -> DEPLOYS -> Malware...");
    await session.run(
      `UNWIND $rels AS rel
       MATCH (a:ThreatActor {name: rel.actor})
       MATCH (b:Malware {name: rel.malware})
       MERGE (a)-[:DEPLOYS]->(b)`,
      { rels: actorDeploysMalware }
    );

    // ThreatActor -[ATTRIBUTED_TO]-> Campaign
    console.log("  ThreatActor -> ATTRIBUTED_TO -> Campaign...");
    await session.run(
      `UNWIND $rels AS rel
       MATCH (a:ThreatActor {name: rel.actor})
       MATCH (b:Campaign {name: rel.campaign})
       MERGE (a)-[:ATTRIBUTED_TO]->(b)`,
      { rels: actorAttributedToCampaign }
    );

    // ThreatActor -[EMPLOYS_TECHNIQUE]-> AttackTechnique
    console.log("  ThreatActor -> EMPLOYS_TECHNIQUE -> AttackTechnique...");
    await session.run(
      `UNWIND $rels AS rel
       MATCH (a:ThreatActor {name: rel.actor})
       MATCH (b:AttackTechnique {mitre_id: rel.technique})
       MERGE (a)-[:EMPLOYS_TECHNIQUE]->(b)`,
      { rels: actorEmploysTechnique }
    );

    // ThreatActor -[COLLABORATES_WITH]-> ThreatActor (bidirectional)
    console.log("  ThreatActor -> COLLABORATES_WITH -> ThreatActor...");
    await session.run(
      `UNWIND $rels AS rel
       MATCH (a:ThreatActor {name: rel.actor1})
       MATCH (b:ThreatActor {name: rel.actor2})
       MERGE (a)-[:COLLABORATES_WITH]->(b)
       MERGE (b)-[:COLLABORATES_WITH]->(a)`,
      { rels: actorCollaborations }
    );

    // Exploit -[TARGETS]-> Vulnerability
    console.log("  Exploit -> TARGETS -> Vulnerability...");
    await session.run(
      `UNWIND $items AS item
       MATCH (e:Exploit {name: item.name})
       MATCH (v:Vulnerability {cve_id: item.target_cve})
       MERGE (e)-[:TARGETS]->(v)`,
      { items: exploits }
    );

    // Vulnerability -[AFFECTS]-> Software
    console.log("  Vulnerability -> AFFECTS -> Software...");
    await session.run(
      `UNWIND $items AS item
       MATCH (v:Vulnerability {cve_id: item.cve_id})
       MATCH (s:Software {name: item.affected_product})
       MERGE (v)-[:AFFECTS]->(s)`,
      { items: vulnerabilities }
    );

    // Software -[USED_BY]-> Organization
    console.log("  Software -> USED_BY -> Organization...");
    await session.run(
      `UNWIND $rels AS rel
       MATCH (s:Software {name: rel.software})
       MATCH (o:Organization {name: rel.org})
       MERGE (s)-[:USED_BY]->(o)`,
      { rels: softwareUsedByOrg }
    );

    // Malware -[EXPLOITS]-> Vulnerability
    console.log("  Malware -> EXPLOITS -> Vulnerability...");
    await session.run(
      `UNWIND $rels AS rel
       MATCH (m:Malware {name: rel.malware})
       MATCH (v:Vulnerability {cve_id: rel.cve})
       MERGE (m)-[:EXPLOITS]->(v)`,
      { rels: malwareExploitsVuln }
    );

    // Campaign -[TARGETS_SECTOR]-> Organization
    console.log("  Campaign -> TARGETS_SECTOR -> Organization...");
    await session.run(
      `UNWIND $rels AS rel
       MATCH (c:Campaign {name: rel.campaign})
       MATCH (o:Organization {name: rel.org})
       MERGE (c)-[:TARGETS_SECTOR]->(o)`,
      { rels: campaignTargetsOrg }
    );

    // Vulnerability -[RELATED_TO]-> Vulnerability
    console.log("  Vulnerability -> RELATED_TO -> Vulnerability...");
    await session.run(
      `UNWIND $rels AS rel
       MATCH (v1:Vulnerability {cve_id: rel.cve1})
       MATCH (v2:Vulnerability {cve_id: rel.cve2})
       MERGE (v1)-[:RELATED_TO]->(v2)
       MERGE (v2)-[:RELATED_TO]->(v1)`,
      { rels: vulnRelatedToVuln }
    );

    // Campaign -[USES]-> AttackTechnique
    console.log("  Campaign -> USES -> AttackTechnique...");
    await session.run(
      `UNWIND $rels AS rel
       MATCH (c:Campaign {name: rel.campaign})
       MATCH (t:AttackTechnique {mitre_id: rel.technique})
       MERGE (c)-[:USES]->(t)`,
      { rels: campaignUsesTechnique }
    );

    // Malware -[USES_TECHNIQUE]-> AttackTechnique
    console.log("  Malware -> USES_TECHNIQUE -> AttackTechnique...");
    await session.run(
      `UNWIND $rels AS rel
       MATCH (m:Malware {name: rel.malware})
       MATCH (t:AttackTechnique {mitre_id: rel.technique})
       MERGE (m)-[:USES]->(t)`,
      { rels: malwareUsesTechnique }
    );

    // 5. Verification
    console.log("\n--- Verification ---");
    const nodeResult = await session.run(
      "MATCH (n) RETURN labels(n)[0] AS type, count(*) AS count ORDER BY count DESC"
    );
    let totalNodes = 0;
    for (const record of nodeResult.records) {
      const type = record.get("type");
      const count = (record.get("count") as Integer).toNumber();
      totalNodes += count;
      console.log(`  ${type}: ${count}`);
    }

    const relResult = await session.run(
      "MATCH ()-[r]->() RETURN type(r) AS type, count(*) AS count ORDER BY count DESC"
    );
    let totalRels = 0;
    for (const record of relResult.records) {
      const type = record.get("type");
      const count = (record.get("count") as Integer).toNumber();
      totalRels += count;
      console.log(`  ${type}: ${count}`);
    }

    console.log(`\nTotal: ${totalNodes} nodes, ${totalRels} relationships`);

    // 6. Verify key attack paths
    console.log("\n--- Attack Path Verification ---");
    const paths = [
      { actor: "APT28", org: "First National Bank" },
      { actor: "Volt Typhoon", org: "Pacific Power Grid" },
      { actor: "Warlock", org: "Federal Systems Agency" },
      { actor: "Rhysida", org: "Metro General Hospital" },
    ];
    for (const p of paths) {
      const pathResult = await session.run(
        `MATCH path = shortestPath(
           (a:ThreatActor {name: $actor})-[*..6]->(o:Organization {name: $org})
         )
         RETURN length(path) AS hops, [n IN nodes(path) | coalesce(n.cve_id, n.name)] AS chain`,
        { actor: p.actor, org: p.org }
      );
      if (pathResult.records.length > 0) {
        const hops = (pathResult.records[0].get("hops") as Integer).toNumber();
        const chain = pathResult.records[0].get("chain");
        console.log(`  ${p.actor} -> ${p.org}: ${hops} hops [${chain.join(" -> ")}]`);
      } else {
        console.log(`  WARNING: No path found from ${p.actor} to ${p.org}`);
      }
    }

    console.log("\nSeed complete!");
  } catch (error) {
    console.error("Seed failed:", error);
    process.exit(1);
  } finally {
    await session.close();
    await driver.close();
  }
}

seed();
