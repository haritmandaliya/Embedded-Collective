export const HERO_CHIPS = [
  'ARM7 LPC2129',
  'Embedded C',
  'Linux Sys',
  'CAN/UART/SPI/I2C',
  'Firmware Dev',
  'C/C++',
] as const

export const PERSONAL_INFO = [
  { label: 'NAME', value: 'Harit Mandaliya' },
  { label: 'DEGREE', value: 'B.E. Computer Engineering' },
  { label: 'TRAINING', value: 'Vector India — Embedded Systems' },
  { label: 'LOCATION', value: 'Bengaluru, India' },
  { label: 'FOCUS', value: 'Embedded & Firmware Dev' },
  { label: 'STATUS', value: 'Open to Opportunities' },
] as const

export const STRENGTHS = [
  { icon: 'Code', text: 'Programming Fundamentals' },
  { icon: 'Brain', text: 'Logical Problem Solving' },
  { icon: 'Cpu', text: 'Firmware Mindset' },
  { icon: 'Layers', text: 'HW-SW Integration' },
  { icon: 'BookOpen', text: 'Continuous Learning' },
  { icon: 'Bug', text: 'Debugging Skills' },
] as const

export const SKILL_CATEGORIES = [
  {
    title: 'PROGRAMMING',
    skills: ['C', 'C++', 'Embedded C', 'Python', 'HTML', 'CSS'],
  },
  {
    title: 'MICROCONTROLLERS',
    skills: ['LPC2129 (ARM7)', 'Arduino UNO'],
  },
  {
    title: 'OS & LINUX',
    skills: ['Linux', 'RTOS Concepts (Fundamentals)'],
  },
  {
    title: 'PROTOCOLS',
    skills: ['UART', 'SPI', 'I2C', 'CAN 2.0'],
    hasWaveform: true,
  },
  {
    title: 'PERIPHERAL INTERFACES',
    skills: ['ADC', 'GPIO', 'DS1307 RTC', 'LCD16x2'],
  },
  {
    title: 'SYSTEM PROGRAMMING',
    skills: ['Linux System Call Programming'],
  },
  {
    title: 'DEV TOOLS',
    skills: ['Keil µVision', 'Arduino IDE', 'Git', 'VS Code'],
  },
  {
    title: 'WEB TECHNOLOGIES',
    skills: ['React', 'Vite', 'Frappe Framework', 'REST APIs'],
  },
] as const

export const EDUCATION = [
  {
    institution: 'Gyanmanjari Institute of Technology (GMIT)',
    location: 'Bhavnagar, Gujarat',
    credential: 'Bachelor of Engineering — Computer Engineering',
    metric: 'CGPA 7.44',
    duration: 'Sept 2022 — Jul 2025',
    level: 'degree' as const,
  },
  {
    institution: 'Sir Bhavsinhji Polytechnic Institute',
    location: 'Bhavnagar, Gujarat',
    credential: 'Diploma in Information Technology',
    metric: 'CGPA 7.39',
    duration: 'Aug 2019 — Jun 2022',
    level: 'diploma' as const,
  },
] as const

export const EXPERIENCE_META = {
  company: 'SERVICE FURTHER',
  role: 'Software Engineering Intern',
  location: 'Remote',
  duration: 'Mar 2025 — Nov 2025',
} as const

export const EXPERIENCE_TASKS = [
  'Enterprise application development with Frappe Framework',
  'React + Vite + Python feature development',
  'Backend functionality & REST API integrations',
  'Reusable frontend component architecture',
  'Git-based collaborative, agile workflow',
] as const

export const EXPERIENCE_ACHIEVEMENTS = [
  'Strengthened software engineering fundamentals',
  'Improved scalable application development understanding',
  'Learned professional development workflows',
] as const

export const PROFICIENCY_BARS = [
  { label: 'Embedded C', value: 85, type: 'embedded' as const },
  { label: 'ARM7 / LPC2129', value: 80, type: 'embedded' as const },
  { label: 'Communication Protocols', value: 75, type: 'embedded' as const },
  { label: 'React', value: 70, type: 'software' as const },
  { label: 'Python', value: 72, type: 'software' as const },
  { label: 'Linux Sys Programming', value: 78, type: 'embedded' as const },
] as const

export const TRAINING_MODULES = [
  { icon: 'Code2', name: 'Embedded C' },
  { icon: 'Cpu', name: 'ARM7 LPC2129' },
  { icon: 'Database', name: 'Data Structures' },
  { icon: 'Terminal', name: 'Linux Sys Programming' },
  { icon: 'Radio', name: 'UART' },
  { icon: 'Share2', name: 'SPI' },
  { icon: 'Link', name: 'I2C' },
  { icon: 'Network', name: 'CAN' },
  { icon: 'Zap', name: 'Interrupts' },
  { icon: 'Clock', name: 'Timers' },
  { icon: 'Activity', name: 'ADC' },
  { icon: 'HardDrive', name: 'Firmware Dev' },
] as const

export const LEARNING_OUTCOMES = [
  { title: 'Efficient Embedded Software', progress: 85 },
  { title: 'HW-SW Interaction', progress: 80 },
  { title: 'Communication Protocols', progress: 78 },
  { title: 'Real-time Firmware', progress: 75 },
  { title: 'Embedded Debugging', progress: 82 },
] as const

export const PROJECTS = [
  {
    id: '01',
    title: 'Smart RFID Employee Attendance System',
    stripe: 'embedded' as const,
    tech: ['LPC2129', 'RFID', 'DS1307 RTC', 'LCD16x2', 'UART'],
    description:
      'An RFID-based attendance and access-management system built on the ARM7 LPC2129. Integrates an RFID reader, a DS1307 real-time clock, and a 16x2 LCD to log attendance with accurate, real-time date and time stamps — removing manual record-keeping entirely.',
    features: [
      'RFID-based identity verification',
      'DS1307 RTC for accurate real-time logging',
      'LCD16x2 live status display',
      'UART-driven data flow between modules',
    ],
  },
  {
    id: '02',
    title: 'TemporalForge — MIDI Drum System',
    stripe: 'embedded' as const,
    tech: ['LPC2129', 'Embedded C', 'UART', 'ADC'],
    description:
      'A real-time electronic MIDI drum system on the LPC2129 ARM7 microcontroller. Drum-pad inputs are read via ADC signal processing and converted into MIDI-compatible data over UART, including dynamic velocity response so harder hits produce louder/brighter notes — true touch-sensitive electronic percussion.',
    features: [
      'ADC-based drum pad signal processing',
      'UART MIDI message generation',
      'Dynamic velocity response',
      'Real-time, low-latency input handling',
    ],
  },
  {
    id: '03',
    title: 'Home Automation System',
    stripe: 'embedded' as const,
    tech: ['Arduino UNO R3', 'HC-05 Bluetooth', '16x2 LCD', '4-Channel Relay'],
    description:
      'Diploma capstone project: an IoT-style home automation system controlling household appliances over Bluetooth. An Arduino UNO R3 reads Bluetooth commands from a phone, drives a 4-channel relay board to switch appliances, and reports live status on a 16x2 LCD.',
    features: [
      'Bluetooth (HC-05) remote appliance control',
      '4-channel relay switching',
      'Real-time LCD status feedback',
      'Sensor + microcontroller + relay integration',
    ],
  },
  {
    id: '04',
    title: 'Student Management System',
    stripe: 'software' as const,
    tech: ['C', 'Singly Linked List'],
    description:
      'A menu-driven student-record management application in pure C, using a singly linked list as the core data structure for dynamic record storage — insertion, deletion, search, and update all implemented from first principles, no library containers.',
    features: [
      'Singly linked list record storage',
      'Insert / delete / search / update operations',
      'Menu-driven console interface',
      'Manual memory management',
    ],
  },
  {
    id: '05',
    title: 'Custom Linux `cp` Command',
    stripe: 'software' as const,
    tech: ['C', 'Linux System Calls'],
    description:
      'A from-scratch reimplementation of the Linux `cp` utility using raw system calls and string-handling functions — a deliberate exercise in low-level file I/O and command-line argument parsing rather than relying on any standard library shortcuts.',
    features: [
      'Direct Linux system call usage',
      'Custom argument parsing',
      'Manual file-copy implementation',
      'Low-level systems programming practice',
    ],
  },
  {
    id: '06',
    title: 'Stack Implementation — Template Class',
    stripe: 'software' as const,
    tech: ['C++', 'Templates'],
    description:
      'A generic stack built with C++ template classes, supporting multiple data types (int, float, double, char, string) through a single reusable implementation — push, pop, display, and peek operations all type-agnostic.',
    features: [
      'C++ template-based generic design',
      'Multi-type support from one implementation',
      'Push / pop / display / peek operations',
    ],
  },
  {
    id: '07',
    title: 'E-book Bargaining & Sell',
    stripe: 'software' as const,
    tech: ['PHP', 'JavaScript', 'Bootstrap', 'MySQL'],
    description:
      'Degree capstone project: a library-management web platform for cataloging, lending, and user management, with separate, intuitive workflows designed for administrators and patrons.',
    features: [
      'Catalog & inventory management',
      'Admin vs. patron workflow separation',
      'MySQL-backed lending records',
      'Responsive Bootstrap interface',
    ],
  },
  {
    id: '08',
    title: 'AI-Powered Resume Analyzer',
    stripe: 'software' as const,
    tech: ['React', 'Vite', 'TypeScript', 'Groq AI API', 'PDF.js'],
    description:
      'A personal project: an AI-assisted resume analysis tool that parses uploaded resumes with PDF.js and scores their compatibility against a target job description using the Groq AI API — built end-to-end with Cursor and modern AI tooling.',
    features: [
      'Client-side PDF parsing (PDF.js)',
      'LLM-based job-description matching',
      'Compatibility scoring',
      'Built with AI-assisted development tooling',
    ],
  },
  {
    id: '09',
    title: 'Service-Further Website',
    stripe: 'software' as const,
    tech: ['React', 'Vite', 'TypeScript', 'Frappe Framework', 'MariaDB'],
    description:
      'A responsive, production service-based web platform built during the Service-Further internship — backend API integration, authentication, and production-ready frontend modules shipped to real users.',
    features: [
      'Production backend API integration',
      'Authentication flow',
      'Production-ready frontend modules',
      'Frappe Framework + MariaDB backend',
    ],
  },
] as const

export const ACHIEVEMENTS = [
  'Successfully completed Computer Engineering degree.',
  'Pursuing professional Embedded Systems training at Vector India.',
  'Developed multiple software and embedded engineering projects.',
  'Gained industry experience through Software Engineering Internship.',
  'Continuously building expertise in Firmware and Embedded Software Development.',
] as const

export const CAREER_OBJECTIVE =
  'My objective is to build a successful career in Embedded Systems and Firmware Engineering by applying my technical knowledge, problem-solving abilities, and passion for low-level software development. I aim to contribute to innovative products that create real-world impact while continuously learning emerging technologies in Embedded Systems, Automotive Electronics, Industrial Automation, and IoT domains.'

export type NavLinkItem = {
  label: string
  href: string
  external?: boolean
  accent?: 'cyan' | 'red'
}

export const NAV_LINKS: NavLinkItem[] = [
  { label: 'ABOUT', href: '#about' },
  { label: 'SKILLS', href: '#skills' },
  { label: 'PROJECTS', href: '#projects' },
  { label: 'CONTACT', href: '#contact' },
  { label: 'COMMUNITY', href: '/community', external: true, accent: 'cyan' },
]

export const CONTACT = {
  email: 'haritmandaliya@gmail.com',
  phone: '+91 7600107607',
  linkedin: 'https://www.linkedin.com/in/harit-mandaliya-92756027b/',
  hackerrank: 'https://www.hackerrank.com/profile/haritmandaliya',
  leetcode: 'https://leetcode.com/u/harit_mandaliya/',
  github: null, // see Section 4.5 below — do not fabricate a URL, leave null and surface a TODO in the UI per Section 14
  location: 'Bengaluru, India',
} as const

export const BEYOND_ENGINEERING = [
  { icon: 'Music', text: 'Tabla Visharad — 2nd Rank, District Tabla Competition' },
  { icon: 'Camera', text: 'Photography & Cinematography' },
  { icon: 'Wrench', text: 'Electronics Troubleshooting' },
  { icon: 'Languages', text: 'English · Hindi · Gujarati' },
] as const
