import React from 'react';
import config from '../../../config';
import { Card } from 'material-ui/Card';
import $ from 'jquery';

const imgstyle = {
    width: "100%"
};
const cardStyle = {
    'textAlign': "center"
};

const InfoBox = React.createClass({

    render () {
        const personalLink = config.WEB_ROOT + '/personal/#' + this.props.publicKey;

        return (
            <Card style={cardStyle}>
                <a target='_blank' href={personalLink}>
                <h1>This extension should not be used by anyone except researchers</h1>
                <p>Currently we lack of documenting the proper data processing, therefore this extension is not ready to be used</p>
                <p>If you use this, is because you are collaboring with the development team.</p>
                </a>
            </Card>
        );
    }
});

export default InfoBox;
