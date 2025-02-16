// /**
//  * This script takes in a URL and list of keywords (from browsing history) and 
//  * returns a list of links that are relevant to the keywords.
//  * 
//  * Links are returned in tuples (description, url)
//  */
// import { ScrapybaraClient } from "scrapybara";

// const client = new ScrapybaraClient({ apiKey: "scrapy-ed4771d6-0e3e-49f0-911f-898e2196e8e3" });

// export interface BrowsingHistory {
//     url: string;
//     keywords: string[];
// }

// interface RankedLink {
//     url: string;
//     relevanceScore: number;
//     title: string;
//     summary: string;
// }

// interface BashResponse {
//     output: string;
// }

// interface PageLinks {
//     url: string;
//     links: string[];
//     relevanceScore: number;
// }

// // Add PriorityQueue class
// class PriorityQueue<T> {
//     private items: Array<{item: T; priority: number}> = [];
//     private maxSize: number;

//     constructor(maxSize: number = 100) {
//         this.maxSize = maxSize;
//     }

//     enqueue(item: T, priority: number) {
//         // Binary insertion to maintain sorted order
//         const element = {item, priority};
//         let low = 0;
//         let high = this.items.length;

//         while (low < high) {
//             const mid = Math.floor((low + high) / 2);
//             if (this.items[mid].priority < priority) {
//                 high = mid;
//             } else {
//                 low = mid + 1;
//             }
//         }

//         // Insert at the correct position
//         this.items.splice(low, 0, element);

//         // If we exceed maxSize, remove lowest priority item
//         if (this.items.length > this.maxSize) {
//             this.items.pop();
//         }
//     }

//     dequeue(): T | undefined {
//         return this.items.shift()?.item;
//     }

//     dequeueN(n: number): T[] {
//         return this.items.splice(0, Math.min(n, this.items.length))
//             .map(item => item.item);
//     }

//     get length(): number {
//         return this.items.length;
//     }

//     peek(): T | undefined {
//         return this.items[0]?.item;
//     }

//     clear() {
//         this.items = [];
//     }
// }

// async function extractLinksFromPage(instance: any, url: string, depth: number = 0): Promise<string[]> {
//     try {
//         console.log(`Attempting to fetch: ${url}`);
//         const curlResult = await instance.bash({
//             command: `curl -L -A "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36" "${url}" | grep -o 'href="[^"]*"' | sed 's/href="//' | sed 's/"//'`
//         });

//         const links = curlResult.output
//             .split('\n')
//             .filter((url: string) => url.trim())
//             .filter((url: string) => url.startsWith('http'))
//             .filter(isValidWebpageUrl)
//             .slice(0, 10);  // Reduced from 20 to 10 links per page

//         console.log(`Found ${links.length} links on page (limited to 10)`);
//         return links;

//     } catch (error) {
//         console.error(`Failed to fetch ${url}:`, error);
//         return [];
//     }
// }

// function analyzeContentRelevance(pageContent: string, link: string): number {
//     let score = 0;
    
//     // Look at text around the link
//     const linkContext = extractLinkContext(pageContent, link);
    
//     // Check for relevant terms in context
//     history.forEach(historyItem => {
//         historyItem.keywords.forEach(keyword => {
//             if (linkContext.includes(keyword.toLowerCase())) {
//                 score += 5;  // Context matches are valuable
//             }
//         });
//     });

//     return score;
// }

// function extractLinkContext(content: string, link: string): string {
//     // Find the link in the content and get surrounding text
//     const linkIndex = content.indexOf(link);
//     if (linkIndex === -1) return '';
    
//     // Get 100 characters before and after the link
//     const start = Math.max(0, linkIndex - 100);
//     const end = Math.min(content.length, linkIndex + link.length + 100);
//     return content.slice(start, end);
// }

// async function createInstance() {
//     const instance = await client.startUbuntu();
//     await instance.bash({
//         command: 'apt-get update && apt-get install -y curl grep'
//     });
//     return instance;
// }

// async function quickContentCheck(instance: any, url: string, keywords: string[]): Promise<number> {
//     try {
//         const grepPatterns = keywords.join('\\|');
//         const result = await instance.bash({
//             command: `curl -L -s "${url}" | head -n 1000 | grep -i -c "${grepPatterns}"`
//         });
//         return Math.min((parseInt(result.output) || 0) * 3, 15);
//     } catch (error) {
//         console.error('Content check error:', error);
//         return 0;
//     }
// }

// async function rankRelevantLinks(
//     startUrl: string, 
//     browsingHistory: BrowsingHistory[],
//     maxDepth: number = 2
// ): Promise<RankedLink[]> {
//     try {
//         // Reduce to 3 instances
//         console.log("Starting instances...");
//         const [instance1, instance2, instance3] = await Promise.all([
//             createInstance(),
//             createInstance(),
//             createInstance()
//         ]);

//         const visitedUrls = new Set<string>();
//         let allLinks = new Set<string>();
//         const rankedLinks: RankedLink[] = [];
//         const urlQueue = new PriorityQueue<string>(50); // Limit to 50 URLs

//         // Add initial URL
//         urlQueue.enqueue(startUrl, calculateUrlRelevance(startUrl, browsingHistory));

//         let foundEnoughGoodLinks = false;
//         let linksChecked = 0;
//         const minLinksToCheck = 10;
//         const maxLinksToCheck = 50;  // Reduced from 200 to 50 total links
        
//         try {
//             while (urlQueue.length > 0 && 
//                   visitedUrls.size < 20 && 
//                   linksChecked < maxLinksToCheck &&  
//                   (!foundEnoughGoodLinks || linksChecked < minLinksToCheck)) {
                
//                 const urlToProcess = urlQueue.dequeue();
//                 if (!urlToProcess || visitedUrls.has(urlToProcess)) continue;
                
//                 visitedUrls.add(urlToProcess);
//                 linksChecked++;
                
//                 console.log(`Checking link ${linksChecked}/${maxLinksToCheck}...`);  // Add progress

//                 // 1. Check URL score first
//                 const urlScore = calculateUrlRelevance(urlToProcess, browsingHistory);
//                 console.log(`URL Score for ${urlToProcess}: ${urlScore}`);
                
//                 // Only skip if we've checked at least 5 links and score is low
//                 if (urlScore < 3 && linksChecked > 5) {
//                     console.log('Skipping due to low URL score (after checking 5 links)');
//                     continue;
//                 }

//                 // 2. Check content score
//                 const contentScore = await quickContentCheck(
//                     instance1, 
//                     urlToProcess, 
//                     browsingHistory.flatMap(h => h.keywords)
//                 );
//                 console.log(`Content Score for ${urlToProcess}: ${contentScore}`);
                
//                 const totalScore = urlScore + contentScore;

//                 // 3. If good score or still checking first 5 links, explore its links
//                 if (totalScore > 15 || linksChecked <= 5) {
//                     if (totalScore > 8) {  // Lower from 15 to 8
//                         console.log(`High quality link found: ${urlToProcess}, Score: ${totalScore}`);
//                         rankedLinks.push({
//                             url: urlToProcess,
//                             relevanceScore: totalScore,
//                             title: urlToProcess,
//                             summary: `Link found at depth ${visitedUrls.size}`
//                         });
//                     }

//                     // 4. Explore links from this page
//                     const newLinks = await extractLinksFromPage(instance1, urlToProcess);
//                     for (const link of newLinks) {
//                         if (!allLinks.has(link) && isValidWebpageUrl(link)) {
//                             allLinks.add(link);
//                             const newUrlScore = calculateUrlRelevance(link, browsingHistory);
//                             urlQueue.enqueue(link, newUrlScore);
//                         }
//                     }
//                 }
//             }

//             if (linksChecked >= maxLinksToCheck) {
//                 console.log(`Reached maximum limit of ${maxLinksToCheck} links checked`);
//             }
//             console.log(`Finished checking ${linksChecked} links`);

//             return rankedLinks
//                 .sort((a, b) => b.relevanceScore - a.relevanceScore)
//                 .slice(0, 5);

//         } finally {
//             console.log("Stopping all instances...");
//             await Promise.all([
//                 instance1.stop(),
//                 instance2.stop(),
//                 instance3.stop()
//             ]);
//         }

//     } catch (error) {
//         console.error('Detailed error:', error);
//         throw error;
//     }
// }

// function calculateUrlRelevance(url: string, history: BrowsingHistory[]): number {
//     let score = 0;
//     const urlLower = url.toLowerCase();
    
//     history.forEach(historyItem => {
//         // Domain matching (lower from 15 to 8)
//         const historyDomain = new URL(historyItem.url).hostname;
//         const linkDomain = new URL(url).hostname;
//         if (historyDomain === linkDomain) score += 8;

//         // Keyword matching with lower weights
//         historyItem.keywords.forEach(keyword => {
//             const keywordLower = keyword.toLowerCase();
//             if (urlLower === keywordLower) score += 12;  // Lower from 20 to 12
//             else if (urlLower.includes(keywordLower)) score += 5;  // Lower from 8 to 5
//         });
//     });

//     // Lower penalty for generic pages
//     if (urlLower.includes('about') || 
//         urlLower.includes('contact') || 
//         urlLower.includes('terms')) {
//         score -= 5;  // Lower from 10 to 5
//     }

//     return Math.min(score, 30); // Lower cap from 40 to 30
// }

// function isValidWebpageUrl(url: string): boolean {
//     try {
//         const parsedUrl = new URL(url);
        
//         // Check if URL is HTTP/HTTPS
//         if (!parsedUrl.protocol.match(/^https?:$/)) {
//             return false;
//         }

//         // Exclude common non-webpage extensions
//         const excludeExtensions = [
//             '.pdf', '.jpg', '.jpeg', '.png', '.gif', '.svg',
//             '.mp4', '.mp3', '.wav', '.zip', '.doc', '.docx',
//             '.xls', '.xlsx', '.css', '.js', '.xml', '.json'
//         ];
        
//         if (excludeExtensions.some(ext => parsedUrl.pathname.toLowerCase().endsWith(ext))) {
//             return false;
//         }

//         // Exclude social media share links
//         const excludeDomains = new Set([
//             'facebook.com/sharer',
//             'twitter.com/share',
//             'linkedin.com/share',
//             'pinterest.com/pin',
//             'mailto:',
//             'tel:',
//             'javascript:'
//         ]);

//         // Convert Set to Array before using .some()
//         const excludeDomainsArray = Array.from(excludeDomains);
//         if (excludeDomainsArray.some((domain: string) => url.toLowerCase().includes(domain))) {
//             return false;
//         }

//         return true;
//     } catch {
//         return false;
//     }
// }

// // Update history to focus on hackathon judging
// const history: BrowsingHistory[] = [
//     {
//         url: "https://hackmit.org/judging",
//         keywords: ["judging", "criteria", "prizes", "submission", "demo", "evaluation", "scoring", "hackathon"]
//     },
//     {
//         url: "https://pennapps.com/judging",
//         keywords: ["technical difficulty", "originality", "impact", "presentation", "project", "innovation", "implementation"]
//     },
//     {
//         url: "https://www.hoohacks.io/judging",
//         keywords: ["judges", "rubric", "categories", "awards", "finalist", "showcase", "devpost", "submission"]
//     }
// ];

// // Rename to be more generic
// function findSimilarSource(url: string, history: BrowsingHistory[]): string {
//     let maxSimilarity = 0;
//     let mostSimilar = '';
    
//     history.forEach(item => {
//         const similarity = calculateUrlRelevance(url, [item]);
//         if (similarity > maxSimilarity) {
//             maxSimilarity = similarity;
//             mostSimilar = new URL(item.url).hostname;
//         }
//     });
    
//     return mostSimilar;
// }

// function getShortDescription(url: string): string {
//     try {
//         // Get the last part of the path
//         const path = new URL(url).pathname;
//         const lastPart = path.split('/').filter(p => p).pop() || '';
        
//         // Convert to readable format
//         return lastPart
//             .replace(/-/g, ' ')
//             .replace(/\.(html|php|aspx)$/, '')
//             .trim() || 'homepage';
//     } catch {
//         return 'homepage';
//     }
// }

// // Add content analysis as a second pass for top results
// async function analyzeTopResults(instance: any, rankedLinks: RankedLink[]): Promise<RankedLink[]> {
//     // Install lynx for content analysis
//     await instance.bash({
//         command: 'apt-get update && apt-get install -y lynx'
//     });

//     // Only analyze top 10 links
//     for (const link of rankedLinks.slice(0, 10)) {
//         try {
//             const contentResult = await instance.bash({
//                 command: `lynx -dump -nolist "${link.url}"`
//             });
//             const pageContent = contentResult.output.toLowerCase();
            
//             // Add content score to URL score
//             const contentScore = analyzeContentRelevance(pageContent, link.url);
//             link.relevanceScore = Math.min(link.relevanceScore + contentScore, 25);
            
//         } catch (error) {
//             console.error(`Error analyzing content for ${link.url}`);
//         }
//     }

//     // Re-sort with updated scores
//     return rankedLinks.sort((a, b) => b.relevanceScore - a.relevanceScore);
// }

// // Cache domain checks
// const domainCache = new Map<string, string>();

// function getDomain(url: string): string {
//     if (domainCache.has(url)) {
//         return domainCache.get(url)!;
//     }
//     try {
//         const domain = new URL(url).hostname;
//         domainCache.set(url, domain);
//         return domain;
//     } catch {
//         return '';
//     }
// }

// async function findRelevantLinks(
//     startUrl: string, 
//     history: BrowsingHistory[]
// ): Promise<[string, string][]> {
//     const rankedLinks = await rankRelevantLinks(startUrl, history);
//     return rankedLinks.length > 0 
//         ? rankedLinks.map((link: RankedLink) => [getShortDescription(link.url), link.url])
//         : [];
// }

// export {
//     rankRelevantLinks,
//     getShortDescription,
//     calculateUrlRelevance,
//     isValidWebpageUrl,
//     findRelevantLinks
// };

// // Move this to the end of the file
// if (require.main === module) {
//     // Example usage with TreeHacks
//     const exampleHistory: BrowsingHistory[] = [
//         {
//             url: "https://hackmit.org/judging",
//             keywords: ["judging", "criteria", "prizes"]
//         }
//     ];

//     findRelevantLinks("https://live.treehacks.com", exampleHistory)
//         .then(results => {
//             if (results.length > 0) {
//                 console.log(results.map(([desc, url]) => `("${desc}", "${url}")`).join("\n"));
//             }
//         })
//         .catch(error => console.error('Error:', error));
// }