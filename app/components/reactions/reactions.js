// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    Image,
    ScrollView,
    TouchableOpacity,
    View,
} from 'react-native';
import {intlShape} from 'react-intl';

import MaterialIcon from 'react-native-vector-icons/MaterialIcons';

import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';
import addReactionIcon from 'assets/images/icons/reaction.png';

import Reaction from './reaction';

export default class Reactions extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            addReaction: PropTypes.func.isRequired,
            getReactionsForPost: PropTypes.func.isRequired,
            removeReaction: PropTypes.func.isRequired,
        }).isRequired,
        highlightedReactions: PropTypes.array.isRequired,
        navigator: PropTypes.object.isRequired,
        onAddReaction: PropTypes.func.isRequired,
        position: PropTypes.oneOf(['right', 'left']),
        postId: PropTypes.string.isRequired,
        reactions: PropTypes.object.isRequired,
        theme: PropTypes.object.isRequired,
        canAddReaction: PropTypes.bool,
        canRemoveReaction: PropTypes.bool.isRequired,
    }

    static defaultProps = {
        position: 'right',
    };

    static contextTypes = {
        intl: intlShape,
    };

    constructor(props) {
        super(props);

        MaterialIcon.getImageSource('close', 20, props.theme.sidebarHeaderTextColor).then((source) => {
            this.closeButton = source;
        });
    }

    componentDidMount() {
        const {actions, postId} = this.props;
        actions.getReactionsForPost(postId);
    }

    handleReactionPress = (emoji, remove) => {
        const {actions, postId} = this.props;
        if (remove && this.props.canRemoveReaction) {
            actions.removeReaction(postId, emoji);
        } else if (!remove && this.props.canAddReaction) {
            actions.addReaction(postId, emoji);
        }
    };

    showReactionList = () => {
        const {navigator, postId, theme} = this.props;
        const {formatMessage} = this.context.intl;
        const options = {
            screen: 'ReactionList',
            title: formatMessage({id: 'mobile.reaction_list.title', defaultMessage: 'Reactions'}),
            animationType: 'slide-up',
            animated: true,
            backButtonTitle: '',
            navigatorStyle: {
                navBarTextColor: theme.sidebarHeaderTextColor,
                navBarBackgroundColor: theme.sidebarHeaderBg,
                navBarButtonColor: theme.sidebarHeaderTextColor,
                screenBackgroundColor: theme.centerChannelBg,
            },
            navigatorButtons: {
                leftButtons: [{
                    id: 'close-reaction-list',
                    icon: this.closeButton,
                }],
            },
            passProps: {
                postId,
            },
        };

        navigator.showModal(options);
    }

    renderReactions = () => {
        const {highlightedReactions, navigator, reactions, theme, postId} = this.props;

        return Array.from(reactions.keys()).map((r) => {
            return (
                <Reaction
                    key={r}
                    count={reactions.get(r).length}
                    emojiName={r}
                    highlight={highlightedReactions.includes(r)}
                    navigator={navigator}
                    onPress={this.handleReactionPress}
                    onLongPress={this.showReactionList}
                    postId={postId}
                    theme={theme}
                />
            );
        });
    };

    render() {
        const {position, reactions, canAddReaction} = this.props;
        const styles = getStyleSheet(this.props.theme);

        if (!reactions.size) {
            return null;
        }

        let addMoreReactions = null;
        if (canAddReaction) {
            addMoreReactions = (
                <TouchableOpacity
                    key='addReaction'
                    onPress={this.props.onAddReaction}
                    style={[styles.reaction]}
                >
                    <Image
                        source={addReactionIcon}
                        style={styles.addReaction}
                    />
                </TouchableOpacity>
            );
        }

        const reactionElements = [];
        switch (position) {
        case 'right':
            reactionElements.push(
                this.renderReactions(),
                addMoreReactions
            );
            break;
        case 'left':
            reactionElements.push(
                addMoreReactions,
                this.renderReactions()
            );
            break;
        }

        return (
            <View style={styles.container}>
                <ScrollView
                    alwaysBounceHorizontal={false}
                    horizontal={true}
                    overScrollMode='never'
                >
                    {reactionElements}
                </ScrollView>
            </View>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            flex: 1,
        },
        addReaction: {
            tintColor: changeOpacity(theme.centerChannelColor, 0.5),
            width: 23,
            height: 20,
        },
        reaction: {
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 2,
            borderColor: changeOpacity(theme.centerChannelColor, 0.3),
            borderWidth: 1,
            flexDirection: 'row',
            height: 30,
            marginRight: 6,
            marginBottom: 5,
            marginTop: 10,
            paddingVertical: 2,
            paddingHorizontal: 6,
            width: 40,
        },
    };
});
