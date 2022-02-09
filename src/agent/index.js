module.exports = async () => {
  const {
    createAcator,
    openGRPCConnection,
    agencyv1,
  } = require("@findy-network/findy-common-ts");
  const qrcode = require("qrcode");
  const acatorProps = {
    authUrl: process.env.FINDY_OIDC_AGENCY_AUTH_URL,
    authOrigin: process.env.FINDY_OIDC_AGENCY_AUTH_ORIGIN,
    userName: "findy-oidc-provider",
    key: "15308490f1e4026284594dd08d31291bc8ef2aeac730d0daf6ff87bb92d4336c",
  };
  const authenticator = createAcator(acatorProps);

  const agencyUrl = process.env.FINDY_OIDC_AGENCY_URL;
  const agencyPort = 50051;
  const connection = await openGRPCConnection(
    { serverAddress: agencyUrl, serverPort: agencyPort, certPath: "" },
    authenticator
  );
  const { createAgentClient, createProtocolClient } = connection;
  const agentClient = await createAgentClient();
  const protocolClient = await createProtocolClient();

  const createPairwiseInvitation = async () => {
    console.log(`Creating invitation for: ${acatorProps.userName}`);

    const msg = new agencyv1.InvitationBase();
    msg.setLabel(acatorProps.userName);

    const res = await agentClient.createInvitation(msg);

    console.log("Invitation created:", res.getUrl());

    return {
      content: res.getUrl(),
      code: await qrcode.toDataURL(res.getUrl()),
      id: JSON.parse(res.getJson())["@id"],
    };
  };
  return {
    createPairwiseInvitation,
  };
};
