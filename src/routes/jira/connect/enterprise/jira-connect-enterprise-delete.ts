import { NextFunction, Request, Response } from "express";
import { GitHubServerApp } from "models/github-server-app";
import { sendAnalytics } from "utils/analytics-client";
import { AnalyticsEventTypes, AnalyticsTrackEventsEnum, AnalyticsTrackSource } from "interfaces/common";

export const JiraConnectEnterpriseDelete = async (
	req: Request,
	res: Response,
	next: NextFunction
): Promise<void> => {
	try {
		req.log.debug("Received Jira Connect Enterprise Server DELETE request");

		const { installation }  = res.locals;

		await GitHubServerApp.uninstallServer(req.body.serverUrl, installation.id);

		await sendAnalytics(res.locals.jiraHost, AnalyticsEventTypes.TrackEvent, {
			action: AnalyticsTrackEventsEnum.RemoveGitHubServerTrackEventName,
			actionSubject: AnalyticsTrackEventsEnum.RemoveGitHubServerTrackEventName,
			source: AnalyticsTrackSource.GitHubEnterprise
		}, {
			success: true
		}, res.locals.userAccountId);

		res.status(200).send({ success: true });
		req.log.debug("Jira Connect Enterprise Server successfully deleted.");
	} catch (error) {

		await sendAnalytics(res.locals.jiraHost, AnalyticsEventTypes.TrackEvent, {
			action: AnalyticsTrackEventsEnum.RemoveGitHubServerTrackEventName,
			actionSubject: AnalyticsTrackEventsEnum.RemoveGitHubServerTrackEventName,
			source: AnalyticsTrackSource.GitHubEnterprise
		}, {
			success: false
		}, res.locals.userAccountId);

		res.status(200).send({ success: false, message: "Failed to delete GitHub Enterprise Server." });
		return next(new Error(`Failed to DELETE GitHub Enterprise Server: ${error}`));
	}
};
