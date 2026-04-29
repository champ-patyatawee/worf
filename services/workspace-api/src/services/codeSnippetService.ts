/**
 * Code Snippet Service
 * 
 * Provides language detection and validation for code snippets.
 * This is an optional enhancement (P2) - not required for core functionality.
 */

export interface LanguageDetectionResult {
  language: string;
  confidence: number;
  pattern: string;
}

export interface ValidationResult {
  isValid: boolean;
  sanitizedContent: string;
  issues: string[];
}

// Supported languages with detection patterns
const LANGUAGE_PATTERNS: Array<{ language: string; patterns: RegExp[]; keywords: string[] }> = [
  {
    language: 'javascript',
    patterns: [
      /\b(const|let|var)\s+\w+\s*=/,
      /function\s*\w*\s*\(/,
      /=>\s*\{/,
      /console\.(log|error|warn)/,
      /require\s*\(/,
      /import\s+.*from\s+['"]/,
    ],
    keywords: ['async', 'await', 'export', 'module', 'prototype'],
  },
  {
    language: 'typescript',
    patterns: [
      /:\s*(string|number|boolean|any|void|never)\b/,
      /interface\s+\w+/,
      /type\s+\w+\s*=/,
      /<\w+>/,
      /as\s+(string|number|any)/,
    ],
    keywords: ['namespace', 'enum', 'implements', 'readonly'],
  },
  {
    language: 'python',
    patterns: [
      /def\s+\w+\s*\(/,
      /import\s+\w+/,
      /from\s+\w+\s+import/,
      /print\s*\(/,
      /if\s+__name__\s*==\s*['"]__main__['"]/,
      /class\s+\w+.*:/,
    ],
    keywords: ['self', 'None', 'True', 'False', 'elif', 'lambda'],
  },
  {
    language: 'java',
    patterns: [
      /public\s+(class|interface|enum)/,
      /private\s+(static\s+)?\w+/,
      /System\.out\.print/,
      /public\s+static\s+void\s+main/,
      /import\s+java\./,
      /@Override/,
    ],
    keywords: ['extends', 'implements', 'throws', 'final'],
  },
  {
    language: 'go',
    patterns: [
      /package\s+\w+/,
      /func\s+\w*\s*\(/,
      /import\s+\(/,
      /fmt\.(Print|Sprintf)/,
      /:=\s*/,
      /go\s+func/,
    ],
    keywords: ['defer', 'chan', 'goroutine', 'interface{}'],
  },
  {
    language: 'rust',
    patterns: [
      /fn\s+\w+\s*\(/,
      /let\s+mut\s+/,
      /impl\s+\w+/,
      /pub\s+fn/,
      /use\s+\w+::/,
      /println!\s*\(/,
    ],
    keywords: ['mut', 'impl', 'trait', 'struct', 'enum'],
  },
  {
    language: 'sql',
    patterns: [
      /SELECT\s+.+\s+FROM/i,
      /INSERT\s+INTO/i,
      /UPDATE\s+\w+\s+SET/i,
      /DELETE\s+FROM/i,
      /CREATE\s+TABLE/i,
      /WHERE\s+\w+\s*=/i,
    ],
    keywords: ['JOIN', 'GROUP BY', 'ORDER BY', 'HAVING'],
  },
  {
    language: 'html',
    patterns: [
      /<html/i,
      /<div/i,
      /<span/i,
      /<script/i,
      /<!DOCTYPE/i,
      /class=["']/,
    ],
    keywords: ['<!DOCTYPE', 'charset', 'viewport'],
  },
  {
    language: 'css',
    patterns: [
      /\{\s*[\w-]+\s*:/,
      /@media\s/,
      /@import\s/,
      /\.?\w+\s*\{/,
      /#[a-fA-F0-9]{3,6}/,
    ],
    keywords: ['display', 'margin', 'padding', 'color', 'background'],
  },
  {
    language: 'json',
    patterns: [
      /^\s*\{[\s\S]*"[\w]+"\s*:/m,
      /^\s*\[[\s\S]*\{/m,
    ],
    keywords: ['null', 'true', 'false'],
  },
  {
    language: 'bash',
    patterns: [
      /^#!/,
      /\$\(.*\)/,
      /\becho\b/,
      /\bif\s+\[\s+/,
      /\bfor\s+\w+\s+in\b/,
      /\|/,
    ],
    keywords: ['fi', 'done', 'esac', 'export', 'source'],
  },
  {
    language: 'markdown',
    patterns: [
      /^#{1,6}\s+/m,
      /\[.+\]\(.+\)/,
      /```[\w]*\n/,
      /^\s*[-*+]\s+/m,
      /^\s*\d+\.\s+/m,
    ],
    keywords: ['**', '__', '~~'],
  },
];

// Simple cache for performance
const detectionCache = new Map<string, LanguageDetectionResult>();

export class CodeSnippetService {
  /**
   * Detect programming language from code content
   */
  detectLanguage(content: string): LanguageDetectionResult {
    // Check cache first
    const cacheKey = content.substring(0, 500); // Use first 500 chars as key
    const cached = detectionCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const trimmedContent = content.trim();
    const scores: Map<string, number> = new Map();

    for (const lang of LANGUAGE_PATTERNS) {
      let score = 0;

      // Check patterns
      for (const pattern of lang.patterns) {
        if (pattern.test(trimmedContent)) {
          score += 2;
        }
      }

      // Check keywords
      for (const keyword of lang.keywords) {
        if (trimmedContent.includes(keyword)) {
          score += 1;
        }
      }

      if (score > 0) {
        scores.set(lang.language, score);
      }
    }

    // Find highest scoring language
    let bestMatch: LanguageDetectionResult = {
      language: 'plaintext',
      confidence: 0,
      pattern: '',
    };

    if (scores.size > 0) {
      const sortedScores = Array.from(scores.entries()).sort((a, b) => b[1] - a[1]);
      const [topLanguage, topScore] = sortedScores[0];

      // Normalize confidence (max score is roughly 15+)
      const confidence = Math.min(topScore / 10, 1);

      bestMatch = {
        language: topLanguage,
        confidence: Math.round(confidence * 100) / 100,
        pattern: 'pattern_matching',
      };
    }

    // Cache the result
    if (detectionCache.size < 1000) {
      detectionCache.set(cacheKey, bestMatch);
    }

    return bestMatch;
  }

  /**
   * Validate code snippet content
   */
  validate(content: string, maxLength = 10000): ValidationResult {
    const issues: string[] = [];
    let sanitizedContent = content;

    // Check length
    if (content.length > maxLength) {
      issues.push(`Content exceeds maximum length of ${maxLength} characters`);
      sanitizedContent = content.substring(0, maxLength);
    }

    // Basic sanitization - remove script-like content for safety
    // Note: This is a simple heuristic and should not be relied upon for security
    const dangerousPatterns = [
      { pattern: /<script[\s\S]*?<\/script>/gi, replacement: '' },
      { pattern: /javascript:/gi, replacement: '' },
      { pattern: /on\w+\s*=/gi, replacement: '' }, // Event handlers like onclick=
    ];

    for (const { pattern, replacement } of dangerousPatterns) {
      if (pattern.test(sanitizedContent)) {
        issues.push('Potentially dangerous content detected and removed');
        sanitizedContent = sanitizedContent.replace(pattern, replacement);
      }
    }

    return {
      isValid: issues.length === 0,
      sanitizedContent,
      issues,
    };
  }

  /**
   * Extract code blocks from markdown content
   */
  extractCodeBlocks(markdown: string): Array<{ language: string; code: string; fullMatch: string }> {
    const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
    const blocks: Array<{ language: string; code: string; fullMatch: string }> = [];

    let match;
    while ((match = codeBlockRegex.exec(markdown)) !== null) {
      blocks.push({
        language: match[1] || 'plaintext',
        code: match[2],
        fullMatch: match[0],
      });
    }

    return blocks;
  }

  /**
   * Clear the detection cache
   */
  clearCache(): void {
    detectionCache.clear();
  }

  /**
   * Get supported languages list
   */
  getSupportedLanguages(): string[] {
    return LANGUAGE_PATTERNS.map((lang) => lang.language);
  }
}

export const codeSnippetService = new CodeSnippetService();
