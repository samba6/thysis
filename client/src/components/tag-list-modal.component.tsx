import React from "react";
import { Modal, List } from "semantic-ui-react";
import jss from "jss";
import preset from "jss-preset-default";
import { withRouter, RouteComponentProps } from "react-router-dom";

import { TagsMinimalRunQuery } from "../graphql/ops.types";
import { TagFragFragment } from "../graphql/gen.types";
import TAGS_QUERY from "../graphql/tags-mini.query";
import {
  FLEX_DIRECTION_COLUMN,
  OVERFLOW_X_HIDDEN,
  makeTagURL
} from "../constants";

jss.setup(preset());

const styles = {
  modal: {
    marginTop: "10%",
    overflowX: OVERFLOW_X_HIDDEN,
    // overflowY: OVERFLOW_Y_AUTO,
    display: "flex",
    flexDirection: FLEX_DIRECTION_COLUMN,
    flex: 1,
    flexShrink: 0, // don't allow flexbox to shrink it
    borderRadius: 0, // clear semantic-ui style
    margin: 0, // clear semantic-ui style
    minWidth: "100%"
  },

  modalContent: {
    maxHeight: "calc(90vh)"
  },

  list: {
    background: "#fff",
    padding: "5px 5px 0 10px"
  },

  listItem: {
    cursor: "pointer"
  }
};

interface TagListModalProps extends RouteComponentProps<{}> {
  open: boolean;
  dismissModal: () => void;
  style?: React.CSSProperties;
}

class TagListModal extends React.PureComponent<TagListModalProps> {
  constructor(props: TagListModalProps) {
    super(props);

    ["navigateTo", "renderTag", "resetModal"].forEach(
      fn => (this[fn] = this[fn].bind(this))
    );
  }

  render() {
    const { open } = this.props;

    return (
      <Modal
        className={`aja`}
        style={styles.modal}
        basic={true}
        size="fullscreen"
        dimmer="inverted"
        open={open}
        closeIcon={true}
        onClose={this.resetModal}
      >
        <Modal.Content style={styles.modalContent} scrolling={true}>
          <TagsMinimalRunQuery query={TAGS_QUERY}>
            {({ data }) => {
              const tags = data ? data.tags : ([] as TagFragFragment[]);

              return (
                <List style={styles.list} divided={true} relaxed={true}>
                  {(tags || []).map(this.renderTag)}
                </List>
              );
            }}
          </TagsMinimalRunQuery>
        </Modal.Content>
      </Modal>
    );
  }

  renderTag = ({ id, text }: TagFragFragment) => {
    return (
      <List.Item key={id} style={styles.listItem} onClick={this.navigateTo(id)}>
        <List.Content>{text}</List.Content>
      </List.Item>
    );
  };

  resetModal = () => {
    this.props.dismissModal();
  };

  navigateTo = (id: string) => () => {
    this.resetModal();
    this.props.history.push(makeTagURL(id));
  };
}

export default withRouter<TagListModalProps>(TagListModal);
