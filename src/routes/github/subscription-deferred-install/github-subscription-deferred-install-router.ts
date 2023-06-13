import { NextFunction, Request, Response, Router } from "express";
import { extractParsedPayload, SubscriptionDeferredInstallPayload } from "utils/subscription-deferred-install-payload";
import { Installation } from "models/installation";
import { GithubServerAppMiddleware } from "middleware/github-server-app-middleware";
import { GithubAuthMiddleware } from "routes/github/github-oauth";
import {
	GithubSubscriptionDeferredInstallGet
} from "routes/github/subscription-deferred-install/github-subscription-deferred-install-get";
import { booleanFlag, BooleanFlags } from "config/feature-flags";

const GithubSubscriptionDeferredInstallRouter = Router({ mergeParams: true });

const subRouter = Router({ mergeParams: true });

const INVALID_PAYLOAD_ERR = "Invalid payload";

GithubSubscriptionDeferredInstallRouter.use("/request/:payload", subRouter);

const validatePayloadAndPopulateJiraHost = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
	const payload = req.params["payload"];
	if (!payload) {
		req.log.warn("No payload");
		res.status(400).json({ error: "No payload" });
		return;
	}

	let parsedPayload: SubscriptionDeferredInstallPayload | undefined;
	try {
		parsedPayload = await extractParsedPayload(req);
	} catch (err) {
		req.log.warn({ err }, "Cannot deserialize");
		res.status(400).json({ error: INVALID_PAYLOAD_ERR });
		return;
	}

	const installation = await Installation.findByPk(parsedPayload.installationIdPk);
	if (!installation) {
		req.log.warn("No installation");
		res.status(400).json({ error: INVALID_PAYLOAD_ERR });
		return;
	}

	if (!await booleanFlag(BooleanFlags.ENABLE_SUBSCRIPTION_DEFERRED_INSTALL, installation.jiraHost)) {
		res.status(401).json({ error: "Feature is disabled" });
		return;
	}

	res.locals.jiraHost = installation.jiraHost;
	res.locals.installation = installation;
	// DO NOT PUT jiraHost to session! This router is invoked by jira non-admins, that would give them admin perms!

	return next();
};

const validateGitHubConfig = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
	const parsedPayload = await extractParsedPayload(req);

	if (parsedPayload.gitHubServerAppIdPk != res.locals.gitHubAppConfig.gitHubAppId) {
		req.log.warn("Wrong appIdPk");
		res.status(400).json({ error: INVALID_PAYLOAD_ERR });
		return;
	}

	return next();
};

subRouter.use(validatePayloadAndPopulateJiraHost);
subRouter.use(GithubServerAppMiddleware);
subRouter.use(validateGitHubConfig);
subRouter.use(GithubAuthMiddleware);

subRouter.get("/", GithubSubscriptionDeferredInstallGet);
export default GithubSubscriptionDeferredInstallRouter;

