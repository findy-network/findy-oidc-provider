const invites = {}; // TODO
module.exports = async (Account) => {
  const {
    createAcator,
    openGRPCConnection,
    agencyv1,
  } = require("@findy-network/findy-common-ts");
  const qrcode = require("qrcode");
  const acatorProps = {
    authUrl: process.env.FINDY_OIDC_AGENCY_AUTH_URL,
    authOrigin: process.env.FINDY_OIDC_AGENCY_AUTH_ORIGIN,
    userName: process.env.FINDY_OIDC_AGENCY_AUTH_USER,
    key: process.env.FINDY_OIDC_AGENCY_AUTH_KEY,
  };
  console.log("Creating acator with auth URL", acatorProps.authUrl);
  const authenticator = createAcator(acatorProps);

  const agencyUrl = process.env.FINDY_OIDC_AGENCY_URL;
  const agencyPort = 50051;

  console.log(`Connecting to agency at ${agencyUrl}:${agencyPort}`);
  const connection = await openGRPCConnection(
    { serverAddress: agencyUrl, serverPort: agencyPort, certPath: "" },
    authenticator
  );
  const { createAgentClient, createProtocolClient } = connection;
  const agentClient = await createAgentClient();
  const protocolClient = await createProtocolClient();

  const startListening = async (uid, id) => {
    console.log(`Starting to listen to ${uid} with invitation id ${id}`);

    const credDefId = process.env.FINDY_OIDC_CRED_DEF_ID;
    const attributes = ["name", "birthdate"];
    let proofId = null;
    await agentClient.startListening(
      async (status) => {
        const notification = status.agent.getNotification();
        const protocolStatus = status.protocol;
        const state = protocolStatus.getState().getState();

        const getValueName = (obj, code) =>
          Object.keys(obj).find((item) => obj[item] === code);

        const typeName = getValueName(
          agencyv1.Notification.Type,
          notification.getTypeid()
        );
        const protocolName = getValueName(
          agencyv1.Protocol.Type,
          notification.getProtocolType()
        );
        const statusName = getValueName(agencyv1.ProtocolState.State, state);
        console.log(`Received ${typeName} for ${protocolName} - ${statusName}`);

        switch (notification.getProtocolType()) {
          case agencyv1.Protocol.Type.DIDEXCHANGE:
            if (
              notification.getTypeid() ===
                agencyv1.Notification.Type.STATUS_UPDATE &&
              state === agencyv1.ProtocolState.State.OK &&
              protocolStatus.getDidExchange().getId() === id
            ) {
              const requestAttributes = new agencyv1.Protocol.Proof();
              attributes.map((item) => {
                const attr = new agencyv1.Protocol.Proof.Attribute();
                attr.setName(item);
                attr.setCredDefid(credDefId);
                requestAttributes.addAttributes(attr);
                return attr;
              });

              const proofRequest = new agencyv1.Protocol.PresentProofMsg();
              proofRequest.setAttributes(requestAttributes);

              const res = await protocolClient.sendProofRequest(
                id,
                proofRequest
              );
              proofId = res.getId();
            }

            break;
          case agencyv1.Protocol.Type.PRESENT_PROOF:
            if (
              notification.getTypeid() ===
                agencyv1.Notification.Type.PROTOCOL_PAUSED &&
              notification.getProtocolid() === proofId
            ) {
              const receivedAttributes = protocolStatus
                .getPresentProof()
                .getProof()
                .getAttributesList();
              const ok =
                receivedAttributes.length === attributes.length &&
                !receivedAttributes.find((item) => item.getValue().length == 0);
              const protocolID = new agencyv1.ProtocolID();
              protocolID.setId(notification.getProtocolid());
              protocolID.setTypeid(notification.getProtocolType());
              protocolID.setRole(agencyv1.Protocol.Role.RESUMER);
              const msg = new agencyv1.ProtocolState();
              msg.setProtocolid(protocolID);
              msg.setState(
                ok
                  ? agencyv1.ProtocolState.State.ACK
                  : agencyv1.ProtocolState.State.NACK
              );
              await protocolClient.resume(msg);
              if (!ok) {
                invites[uid].verified = false;
              }
            } else if (
              notification.getTypeid() ===
                agencyv1.Notification.Type.STATUS_UPDATE &&
              state === agencyv1.ProtocolState.State.OK &&
              notification.getProtocolid() === proofId
            ) {
              invites[uid].verified = true;
              const receivedAttributes = protocolStatus
                .getPresentProof()
                .getProof()
                .getAttributesList();

              const profile = receivedAttributes.reduce(
                (result, item) => ({
                  ...result,
                  [item.getName()]: item.getValue(),
                }),
                { email: "n/a" }
              );
              console.log("Creating new account", profile);
              new Account(uid, profile);
            }
            break;
          default:
            break;
        }
      },
      {
        protocolClient,
        retryOnError: true,
        autoRelease: true,
        autoProtocolStatus: true,
        filterKeepalive: true,
      }
    );
  };

  const createPairwiseInvitation = async (uid) => {
    if (invites[uid]) {
      return invites[uid];
    }
    console.log(`Creating invitation for: ${acatorProps.userName}`);

    const msg = new agencyv1.InvitationBase();
    msg.setLabel(acatorProps.userName);

    const res = await agentClient.createInvitation(msg);

    console.log("Invitation created:", res.getUrl());

    const data = {
      content: res.getUrl(),
      code: await qrcode.toDataURL(res.getUrl()),
      id: JSON.parse(res.getJson())["@id"],
      verified: null,
    };

    invites[uid] = data;
    startListening(uid, data.id); // TODO

    return data;
  };
  return {
    createPairwiseInvitation,
  };
};
