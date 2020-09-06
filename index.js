#! /usr/bin/env node
var inquirer = require('inquirer');
const util = require('util');
const { Octokit } = require("@octokit/rest");

async function promptForUsername() {
    var fa = await inquirer.prompt([{
        type: 'input',
        name: 'owner',
        message: "Github Username:"
    }])
    return fa['owner'];
}

async function promptForToken() {
    var fa = await inquirer.prompt([{
        type: 'input',
        name: 'token',
        message: "Enter your Github Personal Access Token with repository rights:"
    }])
    return fa['token'];
}

function promiseAllIterativeOrFailureObject(promises) {
    return new Promise((resolve, reject) => {
        let results = [];
        let completed = 0;
       
        const handleResult = (result, index) => {
            results[index] = result;
            completed += 1;

            if (completed == promises.length) {
                resolve(results);
            }
        }

        promises.forEach((promise, index) => {
            Promise.resolve(promise).then((r) => handleResult(r, index)).catch((e) => handleResult({fail: true}, index));
        });
    });
}

async function main() {
    const githubOwner = process.env.GITHUB_USERNAME || await promptForUsername();
    const token = process.env.GITHUB_TOKEN || await promptForToken();
    const octokit = new Octokit({ auth: `token ${token}` });

    // const { data: userData } = await octokit.request("/user");

    var { data: repos } = await octokit.repos.listForUser({ username: githubOwner });

    const getRepoTrafficDataFor = async (repos, urlEnding) => {
        var promisesForAllRepos = repos.map((r) => {
            try {
            return octokit.request(`GET /repos/${githubOwner}/${r.name}/traffic/${urlEnding}`)
            } catch(e) {
                return new Promise((resolve, reject) => {
                    resolve({ failed: true })
                }) 
            }
        })

        const allResponses = await promiseAllIterativeOrFailureObject(promisesForAllRepos);
        const dataOrFail = (r) => { return r.failed ? r : r.data }
        return allResponses.map(dataOrFail)
    }

    const clones = await getRepoTrafficDataFor(repos, 'clones')
    const referrers = await getRepoTrafficDataFor(repos, 'popular/referrers')
    const paths = await getRepoTrafficDataFor(repos, 'popular/paths')
    const views = await getRepoTrafficDataFor(repos, 'views')

    repos = repos.map((r, index) => {
        console.log(`\n\nRepo: ${r.name}:`);
        console.log("Clones:", clones[index]);
        console.log("Referrers:", referrers[index]);
        console.log("Paths:", paths[index]);
        console.log("Views:", views[index]);

        r.totalClones = clones[index].count;
        r.totalViews = views[index].count;    
        return r;    
    })

    repos.sort((a, b) => {
        if (a.totalClones > b.totalClones) return -1;
        if (a.totalClones < b.totalClones) return 1;
        return 0;
    });
    const reposByCloneCount = repos.map((r) => `${r.name} - ${r.totalClones}`);
    console.log("\n\n\nRepos sorted by total clone count: ", reposByCloneCount);


    repos.sort((a, b) => {
        if (a.totalViews > b.totalViews) return -1;
        if (a.totalViews < b.totalViews) return 1;
        return 0;
    });
    const reposByViewCount = repos.map((r) => `${r.name} - ${r.totalViews}`);
    console.log("\n\n\nRepos sorted by total view count: ", reposByViewCount);    
}


main().then(() => {})