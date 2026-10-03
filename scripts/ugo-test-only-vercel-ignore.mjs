// Vercel: exit 0 skips a build; exit 1 allows a deliberate publication.
// Keep deploymentEnabled unchanged, but avoid publishing TEST-only audit commits.
import {execFileSync} from 'node:child_process'
const message=process.env.VERCEL_GIT_COMMIT_MESSAGE||execFileSync('git',['log','-1','--pretty=%B'],{encoding:'utf8'})
process.exit(message.includes('[ugo-test-only]')?0:1)
