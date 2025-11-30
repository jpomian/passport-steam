import { Strategy as OpenIDStrategy } from "@passport-next/passport-openid";
import SteamWebAPI from "steam-web";
import util from "util";

function S64toSID(steamId64) {
  const id = BigInt(steamId64);

  const universe = Number((id >> 56n) & 0xffn);
  const y = Number(id & 1n);
  const z = Number((id >> 1n) & 0x7fffffffn);

  return `STEAM_${universe === 1 ? 0 : universe}:${y}:${z}`;
}

const getUserProfile = (key, steamID) => {
  const steam = new SteamWebAPI({ apiKey: key, format: "json" });
  return new Promise((resolve, reject) => {
    steam.getPlayerSummaries({
      steamids: [steamID],
      callback: (err, result) => {
        if (err) {
          return reject(err);
        }
        if (!result?.response?.players?.length) {
          return reject(
            new Error(
              "Malformed response while retrieving user's Steam profile information"
            )
          );
        }
        const player = result.response.players[0];
        const profile = {
          provider: "steam",
          _json: player,
          id: player.steamid,
          sid: S64toSID(player.steamid),
          displayName: player.personaname,
          photos: [
            { value: player.avatar },
            { value: player.avatarmedium },
            { value: player.avatarfull },
          ],
        };
        resolve(profile);
      },
    });
  });
};

class Strategy extends OpenIDStrategy {
  constructor(options, validate) {
    const opts = options || {};
    opts.providerURL = opts.providerURL || "https://steamcommunity.com/openid";
    opts.profile = opts.profile ?? true;
    opts.stateless = true; // Steam only works as a stateless OpenID

    const originalPassReqToCallback = opts.passReqToCallback;
    opts.passReqToCallback = true; // Request needs to be verified

    const verify = async (req, identifier, profile, done) => {
      const OPENID_CHECK = {
        ns: "http://specs.openid.net/auth/2.0",
        claimed_id: "https://steamcommunity.com/openid/id/",
        identity: "https://steamcommunity.com/openid/id/",
      };
      const validOpEndpoint = "https://steamcommunity.com/openid/login";
      const identifierRegex =
        /^https?:\/\/steamcommunity\.com\/openid\/id\/(\d+)$/;

      if (
        req.query["openid.op_endpoint"] !== validOpEndpoint ||
        !identifierRegex.test(identifier) ||
        req.query["openid.ns"] !== OPENID_CHECK.ns ||
        !req.query["openid.claimed_id"]?.startsWith(OPENID_CHECK.claimed_id) ||
        !req.query["openid.identity"]?.startsWith(OPENID_CHECK.identity)
      ) {
        return done(null, false, { message: "Claimed identity is invalid." });
      }

      const steamID = identifierRegex.exec(identifier)[0];

      try {
        if (opts.profile) {
          const userProfile = await getUserProfile(opts.apiKey, steamID);
          if (originalPassReqToCallback) {
            validate(req, identifier, userProfile, done);
          } else {
            validate(identifier, userProfile, done);
          }
        } else {
          if (originalPassReqToCallback) {
            validate(req, identifier, profile, done);
          } else {
            validate(identifier, profile, done);
          }
        }
      } catch (err) {
        done(err);
      }
    };

    super(opts, verify);
    this.name = "steam";
    this.stateless = opts.stateless;
  }
}

util.inherits(Strategy, OpenIDStrategy);

export default Strategy;
