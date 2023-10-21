const core= require('@actions/core');
const github= require('@actions/github');


async function processAllDiscussions() {
    const owner = core.getInput('owner');
    const repo = core.getInput('repository');

    console.log('Accessing all discussions')
    const discussions = await getAllDiscussions(owner, repo);

    console.log('Start processing all discussions')
    for (const discussion of discussions) {
        // Process each discussion here
        console.log('  > Process discussion #'+discussion)
        await processDiscussion(owner, repo, discussion);
    }
    console.log('End processing all discussions')
}


async function getAllDiscussions(owner, repo) {

    const GITHUB_TOKEN = core.getInput('GITHUB_TOKEN');
    const octokit = github.getOctokit(GITHUB_TOKEN);

    console.log('Get all discussions from owner ('+owner+') and repo ('+repo+')')

    try {
        let discussions = [];
        let page = 1;
        let perPage = 30; // Adjust this number based on your needs

        while (true) {
            const response = await octokit.request(
                'GET /repos/'+owner+'/'+repo+'/discussions',
                {
                    owner,
                    repo,
                    page,
                    per_page: perPage,
                }
            );

            if (response.status === 200) {
                const currentDiscussions = response.data;
                if (currentDiscussions.length === 0) {
                    break; // No more discussions to fetch
                }
                discussions = discussions.concat(currentDiscussions);
                page++;
            } else {
                console.error('Error fetching discussions:', response.status);
                break;
            }
        }

        return discussions;
    } catch (error) {
        console.error('Error:', error.message);
        return [];
    }
}




async function processDiscussion(owner, repo, discussionNumber) {
    try {
        const response = await octokit.request(
            'GET /repos/{owner}/{repo}/discussions/{discussion_number}/comments',
            {
                owner,
                repo,
                discussion_number: discussionNumber,
            }
        );

        if (response.status === 200) {
            const comments = response.data;
            const topicAuthorLogin = discussion.user.login;
            if (comments.length > 0) {
                const lastComment = comments[comments.length - 1];
                const sixMonthsAgo = new Date();
                sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 2);
                const commentDate = new Date(lastComment.created_at);

                if (commentDate < sixMonthsAgo) {
                    console.log('Last reply in discussion is older than 2 months:');
                    console.log(lastComment.body);

                    // Check if the last commenter is a member of the "Reviewer" team
                    const commenter = lastComment.user.login;
                    const teamMembership = await octokit.request(
                        'GET /orgs/{org}/teams/{team_slug}/memberships/{username}',
                        {
                            org: owner,
                            team_slug: 'Reviewers', // Replace with your team slug
                            username: commenter,
                        }
                    );

                    if (teamMembership.status === 200 && teamMembership.data.state === 'active') {
                        console.log('Closing discussion #'+discussion_number);
                        //await octokit.request(
                        //  'PATCH /repos/{owner}/{repo}/discussions/{discussion_number}',
                        //  {
                        //    owner,
                        //    repo,
                        //    discussion_number: discussionNumber,
                        //    closed: true,
                        //  }
                        //);

                        // Add a reply to the same discussion
                        console.log('Adding a reply to the discussion');
                        //await octokit.request(
                        //  'POST /repos/{owner}/{repo}/discussions/{discussion_number}/comments',
                        //  {
                        //    owner,
                        //    repo,
                        //    discussion_number: discussionNumber,
                        //    body: `@'+topicAuthorLogin+' your topic has been closed due inactivity.\n Feel free to reopen it with updates or to open any new topic`,              }
                        //);
                    }
                }
            } else {
                console.log('No replies found in discussion #'+discussion_number);
            }
        } else {
            console.error('Error fetching discussion comments:', response.status);
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}


processAllDiscussions();