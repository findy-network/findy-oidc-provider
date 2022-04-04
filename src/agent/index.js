const invites = {}; // TODO
module.exports = async (Account) => {
  const {
    createAcator,
    openGRPCConnection,
    agencyv1,
  } = require("@findy-network/findy-common-ts");
  const qrcode = require("qrcode");

  // Cred def id for proof requests
  const credDefId = process.env.FINDY_OIDC_CRED_DEF_ID;
  // Verified attributes needed for successful login
  const attributes = ["name", "birthdate"];

  // Create authenticator
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

  // Open grpc connection
  console.log(`Connecting to agency at ${agencyUrl}:${agencyPort}`);
  const connection = await openGRPCConnection(
    { serverAddress: agencyUrl, serverPort: agencyPort, certPath: "" },
    authenticator
  );

  // Create clients for API calls
  const { createAgentClient, createProtocolClient } = connection;
  const agentClient = await createAgentClient();
  const protocolClient = await createProtocolClient();

  // Start listening to agent notifications
  const startListening = async (uid, id) => {
    console.log(`Starting to listen to ${uid} with invitation id ${id}`);

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
            // New connection created, send proof
            proofId = await onConnectionCreated(
              id,
              notification,
              state,
              protocolStatus
            );
            break;
          case agencyv1.Protocol.Type.PRESENT_PROOF:
            if (
              notification.getTypeid() ===
                agencyv1.Notification.Type.PROTOCOL_PAUSED &&
              notification.getProtocolid() === proofId
            ) {
              // Verifier checks values
              await onProofValuesReceived(uid, notification, protocolStatus);
            } else if (
              notification.getTypeid() ===
                agencyv1.Notification.Type.STATUS_UPDATE &&
              state === agencyv1.ProtocolState.State.OK &&
              notification.getProtocolid() === proofId
            ) {
              // Verification succesfull, continue signin
              await onProofSuccess(uid, id, protocolStatus);
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

  const onConnectionCreated = async (
    id,
    notification,
    state,
    protocolStatus
  ) => {
    if (
      notification.getTypeid() !== agencyv1.Notification.Type.STATUS_UPDATE ||
      state !== agencyv1.ProtocolState.State.OK ||
      protocolStatus.getDidExchange().getId() !== id
    ) {
      console.log(
        "Ignoring notification with type",
        notification.getTypeid(),
        "state",
        state,
        "id",
        id
      );
      return null;
    }
    // Send basic message first to describe the proof
    const content = new agencyv1.Protocol.BasicMessageMsg();
    content.setContent(
      "Please prove your credential to continue the signin process."
    );
    await protocolClient.sendBasicMessage(id, content);

    // Create and send proof request
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

    const res = await protocolClient.sendProofRequest(id, proofRequest);
    return res.getId();
  };

  const onProofValuesReceived = async (uid, notification, protocolStatus) => {
    // Get proof values
    const receivedAttributes = protocolStatus
      .getPresentProof()
      .getProof()
      .getAttributesList();

    // Check that all attributes are present and not empty
    const ok =
      receivedAttributes.length === attributes.length &&
      !receivedAttributes.find((item) => item.getValue().length == 0);

    // Send response
    const protocolID = new agencyv1.ProtocolID();
    protocolID.setId(notification.getProtocolid());
    protocolID.setTypeid(notification.getProtocolType());
    protocolID.setRole(agencyv1.Protocol.Role.RESUMER);
    const msg = new agencyv1.ProtocolState();
    msg.setProtocolid(protocolID);
    msg.setState(
      ok ? agencyv1.ProtocolState.State.ACK : agencyv1.ProtocolState.State.NACK
    );
    await protocolClient.resume(msg);

    // Update invites map
    if (!ok) {
      invites[uid].verified = false;
    }
  };

  const onProofSuccess = async (uid, connectionId, protocolStatus) => {
    // Send basic message to notify the user
    const content = new agencyv1.Protocol.BasicMessageMsg();
    content.setContent("Thank you! You can now continue the signin process.");
    await protocolClient.sendBasicMessage(connectionId, content);

    // Create account
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
    credDefId,
    attributes,
    createPairwiseInvitation,
  };
};
